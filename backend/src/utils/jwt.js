import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Access tokens are short-lived, stateless JWTs (never stored in the
 * database - validity is whatever jwt.verify says right now). Refresh
 * tokens are a different, opaque, stateful mechanism (see
 * utils/tokenHash.js + modules/auth/auth.repository.js) so a
 * compromised access token can only ever do damage for its short
 * lifetime, while a refresh token can be individually revoked.
 */
export function signAccessToken({ userId, roleName }) {
  return jwt.sign({ sub: String(userId), role: roleName }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

export function verifyAccessToken(token) {
  // Throws (JsonWebTokenError / TokenExpiredError) on anything invalid -
  // callers (authenticate middleware, /auth/validate) decide how to
  // translate that into a response.
  return jwt.verify(token, env.jwt.accessSecret);
}
