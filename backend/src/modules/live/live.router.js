import { Router } from 'express';
import { liveService } from './live.service.js';
import { liveSchema } from './live.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/live/feed - Home: every current live document, from every author. Every role, admin included.
router.get(
  '/feed',
  asyncHandler(async (req, res) => {
    const documents = await liveService.listFeed();
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/live/all - Live (personal): my own current live documents.
router.get(
  '/all',
  authorize(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const documents = await liveService.listMine(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// POST /api/v1/live/upgrade/:document_id - clone a new, editable version into Draft.
router.post(
  '/upgrade/:document_id',
  authorize(...CONTENT_ROLES),
  validate(liveSchema.upgrade),
  asyncHandler(async (req, res) => {
    const created = await liveService.upgrade(req.params.document_id, req.body, req.user.id);
    return ApiResponse.created(res, created, 'New version created in Draft.');
  }),
);

export default router;
