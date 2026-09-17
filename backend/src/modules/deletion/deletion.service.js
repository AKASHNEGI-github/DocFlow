import db from '../../config/db.js';
import { deletionRepository } from './deletion.repository.js';
import { documentsRepository } from '../documents/documents.repository.js';
import { liveRepository } from '../live/live.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { logStageTransition } from '../../utils/phaseWorkflow.js';
import { ApiError } from '../../utils/ApiError.js';
import { DOCUMENT_STAGE, REQUEST_STATUS, APPROVER_ACTION, ROLES } from '../../shared/constants/enums.js';

function toRequestDto(row) {
  return {
    deleteRequestId: row.delete_request_id,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requested_at,
    document: {
      documentId: row.document_id,
      category: row.category,
      documentName: row.document_name,
      versionNo: row.version_no,
      stage: row.stage,
    },
    approvers: row.approvers,
    myRole: row.my_role,
    myAction: row.my_action,
    author: row.author_id ? { userId: row.author_id, fullName: row.author_name } : undefined,
  };
}

async function assertSingleValidHolder(userId, role, label) {
  const validIds = await usersRepository.findValidIdsWithRole(db, [userId], role);
  if (validIds.length !== 1) {
    throw ApiError.badRequest(`The selected ${label} is not a valid, active ${role}.`);
  }
}

export const deletionService = {
  async listMyRequests(userId) {
    const rows = await deletionRepository.listMyRequests(db, userId);
    return rows.map(toRequestDto);
  },

  async listForApproval(userId) {
    const rows = await deletionRepository.listForApproval(db, userId);
    return rows.map(toRequestDto);
  },

  /**
   * Workflow - requestDeletion:
   *  1. Document must exist, be Live, and belong to the caller.
   *  2. Reject if a deletion request is already Pending on it, or if an
   *     upgrade is currently in flight for this family (mirrors, in the
   *     other direction, the same conflict Upgrade itself guards
   *     against - deletion and an active upgrade are never allowed to
   *     overlap, whichever one was started first).
   *  3. Validate the three named users actually hold the role they're
   *     being assigned as (editor/reviewer/publisher) - a mismatch
   *     rejects the whole request rather than silently assigning someone
   *     who doesn't qualify.
   *  4. Inside one transaction: insert the request and its three
   *     PENDING approver rows.
   */
  async requestDeletion(documentId, { reason, editorId, reviewerId, publisherId }, userId) {
    const document = await documentsRepository.getById(db, documentId);
    if (!document) throw ApiError.notFound('Document not found.');
    if (document.stage !== DOCUMENT_STAGE.LIVE) throw ApiError.badRequest('Only a live document can have its deletion requested.');
    if (document.created_by !== userId) throw ApiError.forbidden('Only the author can request deletion of this document.');

    const [existingPending, inFlight] = await Promise.all([
      deletionRepository.getPendingRequestForDocument(db, documentId),
      liveRepository.hasInFlightVersion(db, document.root_document_id, document.document_id),
    ]);
    if (existingPending) throw ApiError.conflict('A deletion request is already pending on this document.');
    if (inFlight) throw ApiError.conflict('An upgrade is currently in progress for this document. Resolve it before requesting deletion.');

    await assertSingleValidHolder(editorId, ROLES.EDITOR, 'editor');
    await assertSingleValidHolder(reviewerId, ROLES.REVIEWER, 'reviewer');
    await assertSingleValidHolder(publisherId, ROLES.PUBLISHER, 'publisher');

    const created = await db.transaction(async (trx) => {
      const request = await deletionRepository.insertRequest(trx, { documentId, reason, createdBy: userId });
      await deletionRepository.insertApprovers(trx, request.delete_request_id, { editorId, reviewerId, publisherId }, userId);
      return request;
    });

    return { deleteRequestId: created.delete_request_id, status: created.status };
  },

  /**
   * Workflow - cancel: the author aborts their own still-Pending
   * request, same as the cancel action available at every other phase.
   * Row-locked so this can't race against a concurrent approver action
   * resolving the same request.
   */
  async cancel(deleteRequestId, userId) {
    return db.transaction(async (trx) => {
      const request = await deletionRepository.getByIdForUpdate(trx, deleteRequestId);
      if (!request) throw ApiError.notFound('Deletion request not found.');
      if (request.created_by !== userId) throw ApiError.forbidden('Only the author can cancel this request.');
      if (request.status !== REQUEST_STATUS.PENDING) throw ApiError.conflict('This request was already resolved.');

      await deletionRepository.updateRequestStatus(trx, deleteRequestId, REQUEST_STATUS.CANCELLED, userId);
    });
  },

  /**
   * Workflow - action (one of the three assigned approvers votes):
   *  1. Lock the request row - must still be Pending.
   *  2. Load THIS user's own approver row - they must be one of the
   *     three assigned, and must not have already voted (unlike
   *     editorial/review/publication's first-responder-wins, all three
   *     people here act independently, so "the request is still
   *     Pending" alone doesn't prove this specific person hasn't already
   *     voted - their own row's action must still be Pending too).
   *  3. Record their vote.
   *  4. REJECTED cancels the whole request immediately - a single no is
   *     enough, the other two votes (cast or not) stop mattering.
   *  5. APPROVED only resolves the request once this makes all three
   *     unanimous - re-count after recording; below 3, the request
   *     simply stays Pending waiting on the rest. Exactly on reaching 3,
   *     cascade-delete the whole document family in the same
   *     transaction as marking the request Approved.
   */
  async action(deleteRequestId, userId, action, comments) {
    return db.transaction(async (trx) => {
      const request = await deletionRepository.getByIdForUpdate(trx, deleteRequestId);
      if (!request) throw ApiError.notFound('Deletion request not found.');
      if (request.status !== REQUEST_STATUS.PENDING) {
        throw ApiError.conflict('This request was already resolved.', { resolvedStatus: request.status });
      }

      const approverRow = await deletionRepository.getApproverRow(trx, deleteRequestId, userId);
      if (!approverRow) throw ApiError.forbidden('You are not an assigned approver on this request.');
      if (approverRow.approver_action !== APPROVER_ACTION.PENDING) {
        throw ApiError.conflict('You have already voted on this request.');
      }

      await deletionRepository.updateApproverAction(trx, deleteRequestId, userId, action, comments);

      const document = await documentsRepository.getById(trx, request.document_id);

      if (action === REQUEST_STATUS.REJECTED) {
        await deletionRepository.updateRequestStatus(trx, deleteRequestId, REQUEST_STATUS.REJECTED, userId);
        await logStageTransition(trx, {
          documentId: request.document_id,
          fromStage: DOCUMENT_STAGE.LIVE,
          toStage: DOCUMENT_STAGE.LIVE,
          oldStatus: REQUEST_STATUS.PENDING,
          newStatus: REQUEST_STATUS.REJECTED,
          actionBy: userId,
        });
        return { deleteRequestId, status: REQUEST_STATUS.REJECTED, documentDeleted: false };
      }

      const approvedCount = await deletionRepository.countApproved(trx, deleteRequestId);
      if (approvedCount < 3) {
        return { deleteRequestId, status: REQUEST_STATUS.PENDING, documentDeleted: false };
      }

      await deletionRepository.updateRequestStatus(trx, deleteRequestId, REQUEST_STATUS.APPROVED, userId);
      await deletionRepository.cascadeDeleteFamily(trx, document.root_document_id);
      await logStageTransition(trx, {
        documentId: request.document_id,
        fromStage: DOCUMENT_STAGE.LIVE,
        toStage: DOCUMENT_STAGE.LIVE,
        oldStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.APPROVED,
        actionBy: userId,
      });

      return { deleteRequestId, status: REQUEST_STATUS.APPROVED, documentDeleted: true };
    });
  },
};
