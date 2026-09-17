import { Router } from 'express';
import { draftService } from './draft.service.js';
import { draftSchema } from './draft.schema.js';
import { usersService } from '../users/users.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { CONTENT_ROLES, ROLES } from '../../shared/constants/enums.js';

const router = Router();

router.use(authenticate, authorize(...CONTENT_ROLES));

// GET /api/v1/draft/all - "My Documents": this user's never-promoted documents.
router.get(
  '/all',
  asyncHandler(async (req, res) => {
    const documents = await draftService.listMyDraftDocuments(req.user.id);
    return ApiResponse.ok(res, documents);
  }),
);

// GET /api/v1/draft/editors - picker list for the Promote modal.
router.get(
  '/editors',
  asyncHandler(async (req, res) => {
    const editors = await usersService.list(ROLES.EDITOR);
    return ApiResponse.ok(res, editors);
  }),
);

// POST /api/v1/draft/promote/:document_id - assign editors, raise the Editorial request.
router.post(
  '/promote/:document_id',
  validate(draftSchema.promote),
  asyncHandler(async (req, res) => {
    const document = await draftService.promote(req.params.document_id, req.body.editorIds, req.user.id);
    return ApiResponse.ok(res, document, 'Promoted for editorial review.');
  }),
);

export default router;
