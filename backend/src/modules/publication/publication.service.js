import db from '../../config/db.js';
import { publicationRepository } from './publication.repository.js';
import { documentsRepository } from '../documents/documents.repository.js';
import { documentsService, toDocumentDto } from '../documents/documents.service.js';
import { usersRepository } from '../users/users.repository.js';
import { liveRepository } from '../live/live.repository.js';
import { raisePhaseRequest, resolvePhaseApproverAction, logStageTransition } from '../../utils/phaseWorkflow.js';
import { ApiError } from '../../utils/ApiError.js';
import { DOCUMENT_STAGE, REQUEST_STATUS, ROLES } from '../../shared/constants/enums.js';

function toRequestDto(row) {
  return {
    ...toDocumentDto(row),
    requestStatus: row.request_status,
    publicationRequestId: row.publication_request_id,
    approvers: row.approvers,
    requestedAt: row.requested_at,
    myAction: row.my_action,
    author: row.author_id ? { userId: row.author_id, fullName: row.author_name } : undefined,
  };
}

export const publicationService = {
  async listMyRequests(userId) {
    const rows = await publicationRepository.listMyRequests(db, userId);
    return rows.map(toRequestDto);
  },

  async listForApproval(userId) {
    const rows = await publicationRepository.listForApproval(db, userId);
    return rows.map(toRequestDto);
  },

  /**
   * Workflow - repromote (Publication[Rejected/unpublished] ->
   * Publication again): unlike Editorial/Review's repromote, this does
   * NOT revert documents.stage first - a publisher's unpublish never
   * undid the Review approval that got the document here in the first
   * place (see publication.service.js#action below), so re-raising just
   * asks a fresh set of publishers to reconsider, still at PUBLICATION.
   */
  async repromote(documentId, publisherIds, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can do this.');

    const phaseInfo = await documentsRepository.getLatestPhaseInfo(db, documentId);
    if (!phaseInfo || phaseInfo.phase !== 'PUBLICATION' || phaseInfo.status !== REQUEST_STATUS.REJECTED) {
      throw ApiError.conflict('This document is not in the expected state for this action.');
    }

    const uniqueIds = [...new Set(publisherIds)];
    const validIds = await usersRepository.findValidIdsWithRole(db, uniqueIds, ROLES.PUBLISHER);
    if (validIds.length !== uniqueIds.length) {
      throw ApiError.badRequest('One or more selected publishers are invalid.');
    }

    await db.transaction(async (trx) => {
      await raisePhaseRequest(trx, {
        requestTable: 'publication_requests',
        approversTable: 'publication_request_approvers',
        requestIdColumn: 'publication_request_id',
        documentId,
        createdBy: userId,
        approverIds: uniqueIds,
      });
      // documents.stage is already PUBLICATION - no change, just logged.
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.PUBLICATION,
        toStage: DOCUMENT_STAGE.PUBLICATION,
        oldStatus: REQUEST_STATUS.REJECTED,
        newStatus: REQUEST_STATUS.PENDING,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /** Workflow - cancel: author aborts their own Pending publication request; stage reverts to REVIEW. */
  async cancel(documentId, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can cancel this request.');

    const pending = await publicationRepository.getPendingRequest(db, documentId);
    if (!pending) throw ApiError.conflict('There is no pending publication request to cancel.');

    await db.transaction(async (trx) => {
      await publicationRepository.cancelRequest(trx, pending.publication_request_id, userId);
      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.REVIEW, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.PUBLICATION,
        toStage: DOCUMENT_STAGE.REVIEW,
        oldStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.CANCELLED,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /**
   * Workflow - action (an assigned publisher's decision - the terminal
   * step for this document, no separate "promote to live" call exists):
   *  - APPROVED = publish:
   *      1. resolvePhaseApproverAction records the decision.
   *      2. Flip this family's previous current document_live row (if
   *         any) to is_current=false, THEN insert the new current row -
   *         that order is required by the partial unique index (see
   *         live.repository.js).
   *      3. documents.stage -> LIVE, is_locked -> true (no more edits;
   *         a future change only ever happens via Live -> Upgrade).
   *  - REJECTED = unpublish:
   *      documents.stage stays PUBLICATION - the content was never in
   *      question, only publish-readiness, so the Review-level approval
   *      it already earned isn't invalidated. The author can raise a
   *      fresh publication_requests row (repromote, above) without
   *      going back through Review again.
   */
  async action(documentId, userId, action, comments) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');

    const pending = await publicationRepository.getPendingRequest(db, documentId);
    if (!pending) throw ApiError.conflict('There is no pending publication request on this document.');

    await db.transaction(async (trx) => {
      await resolvePhaseApproverAction(trx, {
        requestTable: 'publication_requests',
        approversTable: 'publication_request_approvers',
        requestIdColumn: 'publication_request_id',
        requestId: pending.publication_request_id,
        actingUserId: userId,
        action,
        comments,
      });

      if (action === REQUEST_STATUS.APPROVED) {
        await liveRepository.flipCurrentToFalse(trx, document.root_document_id);
        await liveRepository.insertLiveVersion(trx, {
          documentId: document.document_id,
          rootDocumentId: document.root_document_id,
          category: document.category,
          documentName: document.document_name,
          content: document.content,
          versionNo: document.version_no,
          publishedBy: userId,
        });
        await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.LIVE, userId);
        await documentsRepository.lockDocument(trx, documentId);
        await logStageTransition(trx, {
          documentId,
          fromStage: DOCUMENT_STAGE.PUBLICATION,
          toStage: DOCUMENT_STAGE.LIVE,
          oldStatus: REQUEST_STATUS.PENDING,
          newStatus: REQUEST_STATUS.APPROVED,
          actionBy: userId,
        });
      } else {
        // Unpublish: stage deliberately unchanged - see the workflow comment above.
        await logStageTransition(trx, {
          documentId,
          fromStage: DOCUMENT_STAGE.PUBLICATION,
          toStage: DOCUMENT_STAGE.PUBLICATION,
          oldStatus: REQUEST_STATUS.PENDING,
          newStatus: REQUEST_STATUS.REJECTED,
          actionBy: userId,
        });
      }
    });

    return documentsService.getById(documentId, userId);
  },
};
