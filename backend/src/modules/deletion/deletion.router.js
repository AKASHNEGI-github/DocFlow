import { Router } from 'express';
import { deletionService } from './deletion.service.js';
import { deletionSchema } from './deletion.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate, authorize(...CONTENT_ROLES));

// GET /api/v1/deletion/my-requests - live-deletion requests I raised.
router.get(
  '/my-requests',
  asyncHandler(async (req, res) => {
    const requests = await deletionService.listMyRequests(req.user.id);
    return ApiResponse.ok(res, requests);
  }),
);

// GET /api/v1/deletion/for-approval - deletion requests where I'm one of the 3 assigned approvers.
router.get(
  '/for-approval',
  asyncHandler(async (req, res) => {
    const requests = await deletionService.listForApproval(req.user.id);
    return ApiResponse.ok(res, requests);
  }),
);

// POST /api/v1/deletion/request/:document_id - author requests deletion of their own live document.
router.post(
  '/request/:document_id',
  validate(deletionSchema.request),
  asyncHandler(async (req, res) => {
    const created = await deletionService.requestDeletion(req.params.document_id, req.body, req.user.id);
    return ApiResponse.created(res, created, 'Deletion requested.');
  }),
);

// POST /api/v1/deletion/cancel/:delete_request_id - author cancels their own pending deletion request.
router.post(
  '/cancel/:delete_request_id',
  validate(deletionSchema.cancel),
  asyncHandler(async (req, res) => {
    await deletionService.cancel(req.params.delete_request_id, req.user.id);
    return ApiResponse.ok(res, null, 'Deletion request cancelled.');
  }),
);

// POST /api/v1/deletion/action/:delete_request_id - an assigned editor/reviewer/publisher votes.
// The 3rd Approve auto-deletes the whole document family in the same transaction - no separate "finalize" step exists.
router.post(
  '/action/:delete_request_id',
  validate(deletionSchema.action),
  asyncHandler(async (req, res) => {
    const result = await deletionService.action(req.params.delete_request_id, req.user.id, req.body.action, req.body.comments);
    return ApiResponse.ok(res, result, 'Decision recorded.');
  }),
);

export default router;
