import { Router } from 'express';
import { adminService } from './admin.service.js';
import { adminSchema } from './admin.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ROLES } from '../../shared/constants/enums.js';

const router = Router();

// Every route below is admin-only - the whole module is gated here once,
// rather than repeating authorize('admin') on each individual route.
router.use(authenticate, authorize(ROLES.ADMIN));

// GET /api/v1/admin/all - full detail on every user.
router.get(
  '/all',
  asyncHandler(async (req, res) => {
    const users = await adminService.listUsers();
    return ApiResponse.ok(res, users);
  }),
);

// GET /api/v1/admin/roles - the 5 fixed roles.
router.get(
  '/roles',
  asyncHandler(async (req, res) => {
    const roles = await adminService.listRoles();
    return ApiResponse.ok(res, roles);
  }),
);

// POST /api/v1/admin/users - Add User: create an account with any role directly (register() can only ever create an author).
router.post(
  '/users',
  validate(adminSchema.createUser),
  asyncHandler(async (req, res) => {
    const created = await adminService.createUser(req.body, req.user.id);
    return ApiResponse.created(res, created, 'User created.');
  }),
);

// PUT /api/v1/admin/role/:user_id - the only way any user's role ever changes.
router.put(
  '/role/:user_id',
  validate(adminSchema.updateRole),
  asyncHandler(async (req, res) => {
    const updated = await adminService.updateRole(req.params.user_id, req.body.role, req.user.id);
    return ApiResponse.ok(res, updated, 'Role updated.');
  }),
);

// PUT /api/v1/admin/:user_id - edit a user's basic info (name/email/SSO ID/active flag), never role.
router.put(
  '/:user_id',
  validate(adminSchema.updateUser),
  asyncHandler(async (req, res) => {
    const updated = await adminService.updateUser(req.params.user_id, req.body);
    return ApiResponse.ok(res, updated, 'User updated.');
  }),
);

// GET /api/v1/admin/:user_id - full detail on one user.
router.get(
  '/:user_id',
  validate(adminSchema.getById),
  asyncHandler(async (req, res) => {
    const user = await adminService.getById(req.params.user_id);
    return ApiResponse.ok(res, user);
  }),
);

// DELETE /api/v1/admin/:user_id - soft-deletes (one-way); the only way any user is ever deleted.
router.delete(
  '/:user_id',
  validate(adminSchema.deleteById),
  asyncHandler(async (req, res) => {
    await adminService.deleteUser(req.params.user_id);
    return ApiResponse.ok(res, null, 'User deleted.');
  }),
);

export default router;
