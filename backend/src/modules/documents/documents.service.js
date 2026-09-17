import db from '../../config/db.js';
import { documentsRepository } from './documents.repository.js';
import { composeDocumentName, parseDocumentName } from '../../utils/documentName.js';
import { ApiError } from '../../utils/ApiError.js';
import { DOCUMENT_STAGE, REQUEST_STATUS } from '../../shared/constants/enums.js';

function toDocumentDto(row) {
  const { title } = parseDocumentName(row.document_name);
  return {
    documentId: row.document_id,
    category: row.category,
    documentName: row.document_name,
    title,
    content: row.content,
    versionNo: row.version_no,
    stage: row.stage,
    parentDocumentId: row.parent_document_id,
    rootDocumentId: row.root_document_id,
    isLocked: row.is_locked,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    // present when the row came from a query that joined users
    // (getById) - absent (undefined) from create/update, which don't.
    author: row.creator_name ? { userId: row.created_by, fullName: row.creator_name } : undefined,
    // present on rows that came from a query joined against
    // latest_phase_request (listMine); absent (undefined) otherwise.
    latestPhase: row.latest_phase ?? undefined,
    latestStatus: row.latest_status ?? undefined,
  };
}

/**
 * Central permission check for PUT /documents/:document_id, implementing
 * both halves of the edit rule agreed during design:
 *  - the document's OWNER may edit while it has never been promoted
 *    (phase info is null, i.e. still plain Draft/None), or after it's
 *    been Rejected or Cancelled at any phase - never while Pending or
 *    Approved.
 *  - an assigned EDITOR may edit independently of their accept/reject
 *    decision, but only while the document has a currently-Pending
 *    editorial request they're assigned to - reviewers and publishers
 *    never get this at all (confirm-only / publish-only, per design).
 */
async function assertCanEdit(client, document, userId) {
  if (document.is_locked || document.stage === DOCUMENT_STAGE.LIVE) {
    throw ApiError.forbidden('This document is locked and can no longer be edited. Use Upgrade instead.');
  }

  const phaseInfo = await documentsRepository.getLatestPhaseInfo(client, document.document_id);

  if (!phaseInfo) {
    if (document.created_by === userId) return;
    throw ApiError.forbidden('Only the author can edit this document.');
  }

  if (phaseInfo.phase === 'EDITORIAL' && phaseInfo.status === REQUEST_STATUS.PENDING) {
    const editorIds = await documentsRepository.getPendingEditorialApproverIds(client, document.document_id);
    if (editorIds.includes(userId)) return;
  }

  if (phaseInfo.status === REQUEST_STATUS.REJECTED || phaseInfo.status === REQUEST_STATUS.CANCELLED) {
    if (document.created_by === userId) return;
  }

  throw ApiError.forbidden('You do not have permission to edit this document right now.');
}

export const documentsService = {
  /**
   * Workflow - createDocument (Doc Onboard):
   *  1. Compose document_name as "V1 - {title}".
   *  2. Friendly pre-check for a name collision (the table's UNIQUE
   *     constraint is the real backstop, but a pre-check gives a clearer
   *     error than a raw constraint-violation response).
   *  3. Insert inside a transaction (insertDocument itself is two
   *     statements - insert, then set root_document_id to its own new
   *     id - that must commit or roll back together).
   */
  async createDocument({ category, title, content }, userId) {
    const documentName = composeDocumentName(1, title);

    if (await documentsRepository.documentNameExists(db, documentName)) {
      throw ApiError.conflict('A document with this title and version already exists.');
    }

    const document = await db.transaction((trx) => documentsRepository.insertDocument(trx, { category, documentName, content, createdBy: userId }));
    return toDocumentDto(document);
  },

  /**
   * Workflow - getById (Document Detail):
   *  1. Load the document (404 if missing/deleted).
   *  2. Visibility: a Live, non-deleted document is public. Otherwise,
   *     only the owner or someone who is/was an assigned approver on any
   *     of its requests may view it.
   *  3. Attach the latest phase/status and the full stage-history
   *     timeline, both of which the Document Detail view needs.
   */
  async getById(documentId, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');

    const isPubliclyLive = document.stage === DOCUMENT_STAGE.LIVE;
    if (!isPubliclyLive) {
      const isOwner = document.created_by === userId;
      const isApprover = isOwner ? true : await documentsRepository.isAssignedApprover(db, documentId, userId);
      if (!isOwner && !isApprover) {
        throw ApiError.forbidden('You do not have access to this document.');
      }
    }

    const [phaseInfo, stageHistory] = await Promise.all([
      documentsRepository.getLatestPhaseInfo(db, documentId),
      documentsRepository.getStageHistory(db, documentId),
    ]);

    return {
      ...toDocumentDto(document),
      latestPhase: phaseInfo?.phase ?? null,
      latestStatus: phaseInfo?.status ?? REQUEST_STATUS.NONE,
      stageHistory: stageHistory.map((h) => ({
        fromStage: h.from_stage,
        toStage: h.to_stage,
        oldStatus: h.old_status,
        newStatus: h.new_status,
        actionAt: h.action_at,
        actionBy: { userId: h.action_by_id, fullName: h.action_by_name },
      })),
    };
  },

  /** Workflow - listMine: every document the caller authored, for the Dashboard. */
  async listMine(userId) {
    const rows = await documentsRepository.listMine(db, userId);
    return rows.map(toDocumentDto);
  },

  /**
   * Workflow - updateDocument: assertCanEdit enforces who may edit and
   * when (see above); if a new title is given, the document_name is
   * recomposed with the document's CURRENT version_no and re-checked for
   * uniqueness (excluding the document's own current name) before the
   * update is written.
   */
  async updateDocument(documentId, { title, content }, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');

    await assertCanEdit(db, document, userId);

    let documentName;
    if (title !== undefined) {
      documentName = composeDocumentName(document.version_no, title);
      if (documentName !== document.document_name && (await documentsRepository.documentNameExists(db, documentName))) {
        throw ApiError.conflict('A document with this title and version already exists.');
      }
    }

    const updated = await documentsRepository.updateDocument(db, documentId, { documentName, content, updatedBy: userId });
    return toDocumentDto(updated);
  },

  /**
   * Workflow - deleteDocument: only the owner, and only outside Pending
   * (a Pending request must be cancelled first - see each phase
   * module's cancel action) - "delete everywhere except Pending" was the
   * rule settled on for Draft/Editorial/Review/Publication documents.
   * (Live documents are never deleted through this endpoint at all -
   * that's the separate, stricter modules/deletion 3-approver flow.)
   */
  async deleteDocument(documentId, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');

    if (document.created_by !== userId) {
      throw ApiError.forbidden('Only the author can delete this document.');
    }
    if (document.stage === DOCUMENT_STAGE.LIVE) {
      throw ApiError.badRequest('Live documents can only be removed through a Deletion request.');
    }

    const phaseInfo = await documentsRepository.getLatestPhaseInfo(db, documentId);
    const currentStatus = phaseInfo?.status ?? REQUEST_STATUS.NONE;
    if (currentStatus === REQUEST_STATUS.PENDING) {
      throw ApiError.conflict('Cancel the pending request before deleting this document.');
    }

    await documentsRepository.softDelete(db, documentId);
  },
};

export { toDocumentDto };
