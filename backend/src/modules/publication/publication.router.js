import { Router } from 'express';
import { publicationService } from './publication.service.js';
import { publicationSchema } from './publication.schema.js';
import { usersService } from '../users/users.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES, ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate, authorize(...CONTENT_ROLES));

// GET /api/v1/publication/my-requests - documents I authored, currently showing at Publication.
router.get(
  '/my-requests',
  asyncHandler(async (req, res) => {
    const documents = await publicationService.listMyRequests(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/publication/for-approval - publication requests assigned to me, resolved or not.
router.get(
  '/for-approval',
  asyncHandler(async (req, res) => {
    const documents = await publicationService.listForApproval(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/publication/publishers - picker list for the repromote (re-raise) modal.
router.get(
  '/publishers',
  asyncHandler(async (req, res) => {
    const publishers = await usersService.list(ROLES.PUBLISHER);
    return ApiResponse.ok(res, publishers);
  }),
);

// POST /api/v1/publication/repromote/:document_id - Rejected (unpublished) -> a fresh Publication request.
router.post(
  '/repromote/:document_id',
  validate(publicationSchema.repromote),
  asyncHandler(async (req, res) => {
    const document = await publicationService.repromote(req.params.document_id, req.body.publisherIds, req.user.id);
    return ApiResponse.ok(res, document, 'Re-raised for publication.');
  }),
);

// POST /api/v1/publication/cancel/:document_id - author cancels their own pending request.
router.post(
  '/cancel/:document_id',
  validate(publicationSchema.cancel),
  asyncHandler(async (req, res) => {
    const document = await publicationService.cancel(req.params.document_id, req.user.id);
    return ApiResponse.ok(res, document, 'Request cancelled.');
  }),
);

// POST /api/v1/publication/action/:document_id - an assigned publisher publishes (Approve) or unpublishes (Reject).
router.post(
  '/action/:document_id',
  validate(publicationSchema.action),
  asyncHandler(async (req, res) => {
    const document = await publicationService.action(req.params.document_id, req.user.id, req.body.action, req.body.comments);
    const message = req.body.action === 'APPROVED' ? 'Document published.' : 'Document unpublished.';
    return ApiResponse.ok(res, document, message);
  }),
);

export default router;
