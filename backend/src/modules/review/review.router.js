import { Router } from 'express';
import { reviewService } from './review.service.js';
import { reviewSchema } from './review.schema.js';
import { usersService } from '../users/users.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES, ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate, authorize(...CONTENT_ROLES));

// GET /api/v1/review/my-requests - documents I authored, currently showing at Review.
router.get(
  '/my-requests',
  asyncHandler(async (req, res) => {
    const documents = await reviewService.listMyRequests(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/review/for-approval - review requests assigned to me, resolved or not.
router.get(
  '/for-approval',
  asyncHandler(async (req, res) => {
    const documents = await reviewService.listForApproval(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/review/publishers - picker list for the promote-to-Publication modal.
router.get(
  '/publishers',
  asyncHandler(async (req, res) => {
    const publishers = await usersService.list(ROLES.PUBLISHER);
    return ApiResponse.ok(res, publishers);
  }),
);

// POST /api/v1/review/promote/:document_id - Approved -> Publication (assign publishers).
router.post(
  '/promote/:document_id',
  validate(reviewSchema.promote),
  asyncHandler(async (req, res) => {
    const document = await reviewService.promote(req.params.document_id, req.body.publisherIds, req.user.id);
    return ApiResponse.ok(res, document, 'Promoted for publication.');
  }),
);

// POST /api/v1/review/repromote/:document_id - Rejected/Cancelled -> a fresh Review request.
router.post(
  '/repromote/:document_id',
  validate(reviewSchema.repromote),
  asyncHandler(async (req, res) => {
    const document = await reviewService.repromote(req.params.document_id, req.body.reviewerIds, req.user.id);
    return ApiResponse.ok(res, document, 'Re-raised for review.');
  }),
);

// POST /api/v1/review/cancel/:document_id - author cancels their own pending request.
router.post(
  '/cancel/:document_id',
  validate(reviewSchema.cancel),
  asyncHandler(async (req, res) => {
    const document = await reviewService.cancel(req.params.document_id, req.user.id);
    return ApiResponse.ok(res, document, 'Request cancelled.');
  }),
);

// POST /api/v1/review/action/:document_id - an assigned reviewer approves or rejects.
router.post(
  '/action/:document_id',
  validate(reviewSchema.action),
  asyncHandler(async (req, res) => {
    const document = await reviewService.action(req.params.document_id, req.user.id, req.body.action, req.body.comments);
    return ApiResponse.ok(res, document, 'Decision recorded.');
  }),
);

export default router;
