import { Router } from 'express';
import { authService } from './auth.service.js';
import { authSchema } from './auth.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

const router = Router();

function requestMeta(req) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

// POST /api/v1/auth/register - create a new self-service author account.
router.post(
  '/register',
  validate(authSchema.register),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, requestMeta(req));
    return ApiResponse.created(res, result, 'Account created.');
  }),
);

// POST /api/v1/auth/login - authenticate and issue an access/refresh token pair.
router.post(
  '/login',
  validate(authSchema.login),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, requestMeta(req));
    return ApiResponse.ok(res, result, 'Logged in.');
  }),
);

// POST /api/v1/auth/refresh - rotate a refresh token for a new access/refresh pair.
router.post(
  '/refresh',
  validate(authSchema.refresh),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body, requestMeta(req));
    return ApiResponse.ok(res, result, 'Token refreshed.');
  }),
);

// POST /api/v1/auth/logout - revoke a refresh token.
router.post(
  '/logout',
  validate(authSchema.logout),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body);
    return ApiResponse.ok(res, null, 'Logged out.');
  }),
);

// POST /api/v1/auth/validate - check whether an access token is currently valid.
router.post(
  '/validate',
  validate(authSchema.validate),
  asyncHandler(async (req, res) => {
    const result = await authService.validate(req.body);
    return ApiResponse.ok(res, result);
  }),
);

// GET /api/v1/auth/profile - the authenticated caller's own profile.
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user.id);
    return ApiResponse.ok(res, profile);
  }),
);

// POST /api/v1/auth/forgot-password - email a reset link if the address is registered.
router.post(
  '/forgot-password',
  validate(authSchema.forgotPassword),
  asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body, requestMeta(req));
    // Always the same message, regardless of whether the email exists -
    // this endpoint must not reveal which addresses are registered.
    return ApiResponse.ok(res, null, 'If that email is registered, a reset link has been sent.');
  }),
);

// POST /api/v1/auth/reset-password - consume a reset token and set a new password.
router.post(
  '/reset-password',
  validate(authSchema.resetPassword),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    return ApiResponse.ok(res, null, 'Password updated. You can now log in with your new password.');
  }),
);

export default router;
