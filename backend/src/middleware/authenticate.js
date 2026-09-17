import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the Authorization: Bearer <token> header and attaches
 * req.user = { id, role }. The role name is embedded in the access
 * token's payload at login time (see modules/auth/auth.service.js), so
 * this never has to hit the database just to know who's asking - every
 * downstream permission check (authorize.js, and the ownership/assigned-
 * approver checks inside each service method) reads req.user directly.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired access token.'));
  }
}
