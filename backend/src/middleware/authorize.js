import { ApiError } from '../utils/ApiError.js';

/**
 * Route-level role gate, e.g. router.get('/all', authenticate,
 * authorize('admin'), handler). This only ever checks "does this
 * account's role allow calling this endpoint at all" - it never checks
 * "does this user own this specific document" or "is this user the
 * assigned approver on this specific request", both of which depend on
 * data the route params/body point at and are checked inside the
 * relevant service method instead, closer to the query that needs them.
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}
