import { Router } from 'express';
import { documentsService } from './documents.service.js';
import { documentsSchema } from './documents.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/documents/new - Doc Onboard. Admin excluded - it manages users, not documents.
router.post(
  '/new',
  authorize(...CONTENT_ROLES),
  validate(documentsSchema.create),
  asyncHandler(async (req, res) => {
    const document = await documentsService.createDocument(req.body, req.user.id);
    return ApiResponse.created(res, document, 'Document created.');
  }),
);

// GET /api/v1/documents/all - Dashboard: every document the caller authored, any stage.
router.get(
  '/all',
  authorize(...CONTENT_ROLES),
  asyncHandler(async (req, res) => {
    const documents = await documentsService.listMine(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// PUT /api/v1/documents/:document_id - edit title/content; who may do this and when is enforced in the service.
router.put(
  '/:document_id',
  authorize(...CONTENT_ROLES),
  validate(documentsSchema.update),
  asyncHandler(async (req, res) => {
    const updated = await documentsService.updateDocument(req.params.document_id, req.body, req.user.id);
    return ApiResponse.ok(res, updated, 'Document updated.');
  }),
);

// GET /api/v1/documents/:document_id - Document Detail. Visibility enforced in the service (Live is public).
router.get(
  '/:document_id',
  validate(documentsSchema.getById),
  asyncHandler(async (req, res) => {
    const document = await documentsService.getById(req.params.document_id, req.user.id);
    return ApiResponse.ok(res, document);
  }),
);

// DELETE /api/v1/documents/:document_id - owner only, never while Pending.
router.delete(
  '/:document_id',
  authorize(...CONTENT_ROLES),
  validate(documentsSchema.deleteById),
  asyncHandler(async (req, res) => {
    await documentsService.deleteDocument(req.params.document_id, req.user.id);
    return ApiResponse.ok(res, null, 'Document deleted.');
  }),
);

export default router;
