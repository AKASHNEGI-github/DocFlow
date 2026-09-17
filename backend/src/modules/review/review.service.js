import db from '../../config/db.js';
import { reviewRepository } from './review.repository.js';
import { documentsRepository } from '../documents/documents.repository.js';
import { documentsService, toDocumentDto } from '../documents/documents.service.js';
import { usersRepository } from '../users/users.repository.js';
import { raisePhaseRequest, resolvePhaseApproverAction, logStageTransition } from '../../utils/phaseWorkflow.js';
import { ApiError } from '../../utils/ApiError.js';
import { DOCUMENT_STAGE, REQUEST_STATUS, RE_PROMOTABLE_STATUSES, ROLES } from '../../shared/constants/enums.js';

function toRequestDto(row) {
  return {
    ...toDocumentDto(row),
    requestStatus: row.request_status,
    reviewRequestId: row.review_request_id,
    approvers: row.approvers,
    requestedAt: row.requested_at,
    myAction: row.my_action,
    author: row.author_id ? { userId: row.author_id, fullName: row.author_name } : undefined,
  };
}

async function assertOwnerAndPhase(documentId, userId, expectedStatuses) {
  const document = await documentsRepository.getById(db, documentId);
  if (!document) throw ApiError.notFound('Document not found.');
  if (document.created_by !== userId) throw ApiError.forbidden('Only the author can do this.');

  const phaseInfo = await documentsRepository.getLatestPhaseInfo(db, documentId);
  if (!phaseInfo || phaseInfo.phase !== 'REVIEW' || !expectedStatuses.includes(phaseInfo.status)) {
    throw ApiError.conflict('This document is not in the expected state for this action.');
  }
  return { document, phaseInfo };
}

export const reviewService = {
  async listMyRequests(userId) {
    const rows = await reviewRepository.listMyRequests(db, userId);
    return rows.map(toRequestDto);
  },

  async listForApproval(userId) {
    const rows = await reviewRepository.listForApproval(db, userId);
    return rows.map(toRequestDto);
  },

  /**
   * Workflow - promote (Review[Approved] -> Publication):
   *  1. Must be the author, latest review request must be Approved.
   *  2. Validate publisherIds are real, active, publisher-role users.
   *  3. Inside one transaction: raise a Pending publication_requests row,
   *     advance documents.stage REVIEW -> PUBLICATION, log it.
   */
  async promote(documentId, publisherIds, userId) {
    await assertOwnerAndPhase(documentId, userId, [REQUEST_STATUS.APPROVED]);

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
      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.PUBLICATION, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.REVIEW,
        toStage: DOCUMENT_STAGE.PUBLICATION,
        oldStatus: REQUEST_STATUS.APPROVED,
        newStatus: REQUEST_STATUS.PENDING,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /**
   * Workflow - repromote (Review[Rejected/Cancelled] -> Review again):
   * stage reverted to EDITORIAL when the prior request was rejected/
   * cancelled, so raising a new one advances it back to REVIEW.
   */
  async repromote(documentId, reviewerIds, userId) {
    await assertOwnerAndPhase(documentId, userId, RE_PROMOTABLE_STATUSES);

    const uniqueIds = [...new Set(reviewerIds)];
    const validIds = await usersRepository.findValidIdsWithRole(db, uniqueIds, ROLES.REVIEWER);
    if (validIds.length !== uniqueIds.length) {
      throw ApiError.badRequest('One or more selected reviewers are invalid.');
    }

    await db.transaction(async (trx) => {
      await raisePhaseRequest(trx, {
        requestTable: 'review_requests',
        approversTable: 'review_request_approvers',
        requestIdColumn: 'review_request_id',
        documentId,
        createdBy: userId,
        approverIds: uniqueIds,
      });
      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.REVIEW, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.EDITORIAL,
        toStage: DOCUMENT_STAGE.REVIEW,
        oldStatus: REQUEST_STATUS.REJECTED,
        newStatus: REQUEST_STATUS.PENDING,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /** Workflow - cancel: author aborts their own Pending review request; stage reverts to EDITORIAL. */
  async cancel(documentId, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can cancel this request.');

    const pending = await reviewRepository.getPendingRequest(db, documentId);
    if (!pending) throw ApiError.conflict('There is no pending review request to cancel.');

    await db.transaction(async (trx) => {
      await reviewRepository.cancelRequest(trx, pending.review_request_id, userId);
      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.EDITORIAL, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.REVIEW,
        toStage: DOCUMENT_STAGE.EDITORIAL,
        oldStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.CANCELLED,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /**
   * Workflow - action (an assigned reviewer's Approve/Reject): confirm-
   * only, no edit capability at this phase (see documents.service.js's
   * assertCanEdit - reviewers are never granted edit rights). Approve
   * leaves documents.stage at REVIEW; Reject reverts it to EDITORIAL.
   */
  async action(documentId, userId, action, comments) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');

    const pending = await reviewRepository.getPendingRequest(db, documentId);
    if (!pending) throw ApiError.conflict('There is no pending review request on this document.');

    const nextStage = action === REQUEST_STATUS.APPROVED ? DOCUMENT_STAGE.REVIEW : DOCUMENT_STAGE.EDITORIAL;

    await db.transaction(async (trx) => {
      await resolvePhaseApproverAction(trx, {
        requestTable: 'review_requests',
        approversTable: 'review_request_approvers',
        requestIdColumn: 'review_request_id',
        requestId: pending.review_request_id,
        actingUserId: userId,
        action,
        comments,
      });
      await documentsRepository.updateStage(trx, documentId, nextStage, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.REVIEW,
        toStage: nextStage,
        oldStatus: REQUEST_STATUS.PENDING,
        newStatus: action,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },
};
