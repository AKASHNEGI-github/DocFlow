import { Router } from 'express';
import { usersService } from './users.service.js';
import { usersSchema } from './users.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/users/all?role= - lightweight directory, any authenticated user.
router.get(
  '/all',
  validate(usersSchema.list),
  asyncHandler(async (req, res) => {
    const users = await usersService.list(req.query.role);
    return ApiResponse.ok(res, users);
  }),
);

// PUT /api/v1/users/me - self-service update of own basic info (never role).
router.put(
  '/me',
  validate(usersSchema.updateMe),
  asyncHandler(async (req, res) => {
    const updated = await usersService.updateMe(req.user.id, req.body);
    return ApiResponse.ok(res, updated, 'Profile updated.');
  }),
);

// PUT /api/v1/users/me/password - self-service password change (requires current password).
router.put(
  '/me/password',
  validate(usersSchema.changePassword),
  asyncHandler(async (req, res) => {
    await usersService.changePassword(req.user.id, req.body);
    return ApiResponse.ok(res, null, 'Password changed.');
  }),
);

// GET /api/v1/users/:user_id - lightweight profile of another user (for attribution display).
router.get(
  '/:user_id',
  validate(usersSchema.getById),
  asyncHandler(async (req, res) => {
    const user = await usersService.getById(req.params.user_id);
    return ApiResponse.ok(res, user);
  }),
);

export default router;
