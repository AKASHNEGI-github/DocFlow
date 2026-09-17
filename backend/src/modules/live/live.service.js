import db from '../../config/db.js';
import { liveRepository } from './live.repository.js';
import { documentsRepository } from '../documents/documents.repository.js';
import { composeDocumentName, parseDocumentName } from '../../utils/documentName.js';
import { ApiError } from '../../utils/ApiError.js';
import { DOCUMENT_STAGE } from '../../shared/constants/enums.js';

function toLiveDto(row) {
  const { title } = parseDocumentName(row.document_name);
  return {
    documentId: row.document_id,
    rootDocumentId: row.root_document_id,
    category: row.category,
    documentName: row.document_name,
    title,
    content: row.content,
    versionNo: row.version_no,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    author: row.author_id ? { userId: row.author_id, fullName: row.author_name } : undefined,
  };
}

export const liveService = {
  /** Home: every current live document, from every author - the public feed. */
  async listFeed() {
    const rows = await liveRepository.listPublicFeed(db);
    return rows.map(toLiveDto);
  },

  /** Live (personal): current live documents whose current version I authored. */
  async listMine(userId) {
    const rows = await liveRepository.listMine(db, userId);
    return rows.map(toLiveDto);
  },

  /**
   * Workflow - upgrade:
   *  1. Load the document; must be Live and belong to the caller (the
   *     current version's own creator, per the ownership rule used
   *     everywhere else).
   *  2. Block if another version of this family is already anywhere
   *     between Draft and Publication (one upgrade in flight per family
   *     - starting a second before the first reaches Live isn't an
   *     "upgrade", the author already has an edit option on that one in
   *     Draft), or if a deletion request is currently Pending on this
   *     document (approving it would cascade-delete the whole family,
   *     including whatever the upgrade is mid-way through building).
   *  3. Compose the new version's document_name at version_no + 1;
   *     category is carried over unchanged (fixed, not editable here -
   *     only title/content are).
   *  4. Insert the clone at stage=DRAFT, parent_document_id = the live
   *     document's id, root_document_id carried over from the family.
   *     The live document itself is untouched - it stays exactly as
   *     published until this new version completes its own full trip
   *     through the pipeline and is itself approved to publish.
   */
  async upgrade(documentId, { title, content }, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.stage !== DOCUMENT_STAGE.LIVE) throw ApiError.badRequest('Only a live document can be upgraded.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can upgrade this document.');

    const [inFlight, deletionPending] = await Promise.all([
      liveRepository.hasInFlightVersion(db, document.root_document_id, document.document_id),
      liveRepository.hasPendingDeletionRequest(db, document.document_id),
    ]);
    if (inFlight) throw ApiError.conflict('Another version of this document is already being upgraded.');
    if (deletionPending) throw ApiError.conflict('This document has a pending deletion request. Resolve it before upgrading.');

    const nextVersionNo = document.version_no + 1;
    const documentName = composeDocumentName(nextVersionNo, title);
    if (await documentsRepository.documentNameExists(db, documentName)) {
      throw ApiError.conflict('A document with this title and version already exists.');
    }

    const created = await documentsRepository.insertUpgradeVersion(db, {
      category: document.category,
      documentName,
      content,
      versionNo: nextVersionNo,
      parentDocumentId: document.document_id,
      rootDocumentId: document.root_document_id,
      createdBy: userId,
    });

    return {
      documentId: created.document_id,
      documentName: created.document_name,
      stage: created.stage,
      versionNo: created.version_no,
    };
  },
};

export { toLiveDto };
