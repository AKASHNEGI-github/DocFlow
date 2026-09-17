import db from '../../config/db.js';
import { editorialRepository } from './editorial.repository.js';
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
    editorialRequestId: row.editorial_request_id,
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
  if (!phaseInfo || phaseInfo.phase !== 'EDITORIAL' || !expectedStatuses.includes(phaseInfo.status)) {
    throw ApiError.conflict('This document is not in the expected state for this action.');
  }
  return { document, phaseInfo };
}

async function validateEditorIds(editorIds) {
  const uniqueIds = [...new Set(editorIds)];
  const validIds = await usersRepository.findValidIdsWithRole(db, uniqueIds, ROLES.EDITOR);
  if (validIds.length !== uniqueIds.length) {
    throw ApiError.badRequest('One or more selected editors are invalid.');
  }
  return uniqueIds;
}

export const editorialService = {
  async listMyRequests(userId) {
    const rows = await editorialRepository.listMyRequests(db, userId);
    return rows.map(toRequestDto);
  },

  async listForApproval(userId) {
    const rows = await editorialRepository.listForApproval(db, userId);
    return rows.map(toRequestDto);
  },

  /**
   * Workflow - promote (Editorial[Approved] -> Review):
   *  1. Must be the author, and the document's latest editorial request
   *     must be Approved (an editor has already signed off).
   *  2. Validate reviewerIds are real, active, reviewer-role users.
   *  3. Inside one transaction: raise a Pending review_requests row,
   *     advance documents.stage EDITORIAL -> REVIEW, log the transition.
   */
  async promote(documentId, reviewerIds, userId) {
    await assertOwnerAndPhase(documentId, userId, [REQUEST_STATUS.APPROVED]);

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
        oldStatus: REQUEST_STATUS.APPROVED,
        newStatus: REQUEST_STATUS.PENDING,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /**
   * Workflow - repromote (Editorial[Rejected/Cancelled] -> Editorial
   * again): a fresh attempt at the SAME phase after a setback, not a
   * forward move - stage reverted to DRAFT when the prior request was
   * rejected/cancelled, so raising a new one advances it back to
   * EDITORIAL, exactly mirroring the original promote.
   */
  async repromote(documentId, editorIds, userId) {
    await assertOwnerAndPhase(documentId, userId, RE_PROMOTABLE_STATUSES);
    const uniqueIds = await validateEditorIds(editorIds);

    await db.transaction(async (trx) => {
      await raisePhaseRequest(trx, {
        requestTable: 'editorial_requests',
        approversTable: 'editorial_request_approvers',
        requestIdColumn: 'editorial_request_id',
        documentId,
        createdBy: userId,
        approverIds: uniqueIds,
      });
      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.EDITORIAL, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.DRAFT,
        toStage: DOCUMENT_STAGE.EDITORIAL,
        oldStatus: REQUEST_STATUS.REJECTED,
        newStatus: REQUEST_STATUS.PENDING,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /**
   * Workflow - cancel: author aborts their own still-Pending request.
   * Reverts documents.stage back to DRAFT, same as a reject - the
   * promotion attempt never happened as far as the document's structural
   * state is concerned, even though the record of it stays in
   * editorial_requests for history.
   */
  async cancel(documentId, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can cancel this request.');

    const pending = await editorialRepository.getPendingRequest(db, documentId);
    if (!pending) throw ApiError.conflict('There is no pending editorial request to cancel.');

    await db.transaction(async (trx) => {
      await editorialRepository.cancelRequest(trx, pending.editorial_request_id, userId);
      await documentsRepository.updateStage(trx, documentId, DOCUMENT_STAGE.DRAFT, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.EDITORIAL,
        toStage: DOCUMENT_STAGE.DRAFT,
        oldStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.CANCELLED,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },

  /**
   * Workflow - action (an assigned editor's Approve/Reject):
   *  1. resolvePhaseApproverAction enforces assignment + first-responder-
   *     wins + the FOR UPDATE race guard (see utils/phaseWorkflow.js).
   *  2. Approve leaves documents.stage at EDITORIAL (already there since
   *     promote); Reject reverts it to DRAFT - "the doc stage is draft
   *     but we have to list the doc in Phase: Editorial" from the
   *     original flow description, which the Core Navigation Rule (not
   *     documents.stage) is what actually keeps it visible there.
   */
  async action(documentId, userId, action, comments) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');

    const pending = await editorialRepository.getPendingRequest(db, documentId);
    if (!pending) throw ApiError.conflict('There is no pending editorial request on this document.');

    const nextStage = action === REQUEST_STATUS.APPROVED ? DOCUMENT_STAGE.EDITORIAL : DOCUMENT_STAGE.DRAFT;

    await db.transaction(async (trx) => {
      await resolvePhaseApproverAction(trx, {
        requestTable: 'editorial_requests',
        approversTable: 'editorial_request_approvers',
        requestIdColumn: 'editorial_request_id',
        requestId: pending.editorial_request_id,
        actingUserId: userId,
        action,
        comments,
      });
      await documentsRepository.updateStage(trx, documentId, nextStage, userId);
      await logStageTransition(trx, {
        documentId,
        fromStage: DOCUMENT_STAGE.EDITORIAL,
        toStage: nextStage,
        oldStatus: REQUEST_STATUS.PENDING,
        newStatus: action,
        actionBy: userId,
      });
    });

    return documentsService.getById(documentId, userId);
  },
};
