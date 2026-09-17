import db from '../../config/db.js';
import { draftRepository } from './draft.repository.js';
import { documentsRepository } from '../documents/documents.repository.js';
import { documentsService, toDocumentDto } from '../documents/documents.service.js';
import { usersRepository } from '../users/users.repository.js';
import { raisePhaseRequest, logStageTransition } from '../../utils/phaseWorkflow.js';
import { ApiError } from '../../utils/ApiError.js';
import { DOCUMENT_STAGE, REQUEST_STATUS, ROLES } from '../../shared/constants/enums.js';

export const draftService = {
  /** Workflow - listMyDraftDocuments: see draft.repository.js for the exact "never promoted" definition. */
  async listMyDraftDocuments(userId) {
    const rows = await draftRepository.listMyDraftDocuments(db, userId);
    return rows.map(toDocumentDto);
  },

  /**
   * Workflow - promote (Draft -> Editorial):
   *  1. Load the document; must exist, belong to the caller, and
   *     currently be a plain, never-promoted Draft (stage=DRAFT and no
   *     request row yet - re-checked here even though the frontend only
   *     ever shows this action on such documents, since the request body
   *     is the actual trust boundary, not the UI).
   *  2. Validate every submitted editorId is a real, active user who
   *     holds the editor role - rejects the whole request if any id
   *     doesn't qualify, rather than silently dropping it.
   *  3. Inside one transaction: raise a new Pending editorial_requests
   *     row with one approver row per editor, advance documents.stage
   *     to EDITORIAL immediately (the request being outstanding, not
   *     yet an editor's decision, is what "in stage=EDITORIAL,
   *     status=PENDING" describes), and log the transition.
   */
  async promote(documentId, editorIds, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can promote this document.');
    if (document.stage !== DOCUMENT_STAGE.DRAFT) throw ApiError.conflict('This document has already been promoted.');

    const phaseInfo = await documentsRepository.getLatestPhaseInfo(db, documentId);
    if (phaseInfo) throw ApiError.conflict('This document has already been promoted.');

    const uniqueEditorIds = [...new Set(editorIds)];
    const validIds = await usersRepository.findValidIdsWithRole(db, uniqueEditorIds, ROLES.EDITOR);
    if (validIds.length !== uniqueEditorIds.length) {
      throw ApiError.badRequest('One or more selected editors are invalid.');
    }

    await db.transaction(async (trx) => {
      await raisePhaseRequest(trx, {
        requestTable: 'editorial_requests',
        approversTable: 'editorial_request_approvers',
        requestIdColumn: 'editorial_request_id',
        documentId,
        createdBy: userId,
        approverIds: uniqueEditorIds,
      });

      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.EDITORIAL, userId);

      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.DRAFT,
        toStage: DOCUMENT_STAGE.EDITORIAL,
        oldStatus: REQUEST_STATUS.NONE,
        newStatus: REQUEST_STATUS.PENDING,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },
};
