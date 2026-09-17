import { Router } from 'express';
import { editorialService } from './editorial.service.js';
import { editorialSchema } from './editorial.schema.js';
import { usersService } from '../users/users.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES, ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate, authorize(...CONTENT_ROLES));

// GET /api/v1/editorial/my-requests - documents I authored, currently showing at Editorial.
router.get(
  '/my-requests',
  asyncHandler(async (req, res) => {
    const documents = await editorialService.listMyRequests(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/editorial/for-approval - editorial requests assigned to me, resolved or not.
router.get(
  '/for-approval',
  asyncHandler(async (req, res) => {
    const documents = await editorialService.listForApproval(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/editorial/reviewers - picker list for the promote-to-Review modal.
router.get(
  '/reviewers',
  asyncHandler(async (req, res) => {
    const reviewers = await usersService.list(ROLES.REVIEWER);
    return ApiResponse.ok(res, reviewers);
  }),
);

// POST /api/v1/editorial/promote/:document_id - Approved -> Review (assign reviewers).
router.post(
  '/promote/:document_id',
  validate(editorialSchema.promote),
  asyncHandler(async (req, res) => {
    const document = await editorialService.promote(req.params.document_id, req.body.reviewerIds, req.user.id);
    return ApiResponse.ok(res, document, 'Promoted for review.');
  }),
);

// POST /api/v1/editorial/repromote/:document_id - Rejected/Cancelled -> a fresh Editorial request.
router.post(
  '/repromote/:document_id',
  validate(editorialSchema.repromote),
  asyncHandler(async (req, res) => {
    const document = await editorialService.repromote(req.params.document_id, req.body.editorIds, req.user.id);
    return ApiResponse.ok(res, document, 'Re-raised for editorial review.');
  }),
);

// POST /api/v1/editorial/cancel/:document_id - author cancels their own pending request.
router.post(
  '/cancel/:document_id',
  validate(editorialSchema.cancel),
  asyncHandler(async (req, res) => {
    const document = await editorialService.cancel(req.params.document_id, req.user.id);
    return ApiResponse.ok(res, document, 'Request cancelled.');
  }),
);

// POST /api/v1/editorial/action/:document_id - an assigned editor approves or rejects.
router.post(
  '/action/:document_id',
  validate(editorialSchema.action),
  asyncHandler(async (req, res) => {
    const document = await editorialService.action(req.params.document_id, req.user.id, req.body.action, req.body.comments);
    return ApiResponse.ok(res, document, 'Decision recorded.');
  }),
);

export default router;
