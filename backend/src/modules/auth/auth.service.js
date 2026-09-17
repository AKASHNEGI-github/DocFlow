import db from '../../config/db.js';
import { authRepository } from './auth.repository.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signAccessToken, verifyAccessToken } from '../../utils/jwt.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../utils/tokenHash.js';
import { sendMail } from '../../utils/mailer.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { ROLES } from '../../shared/constants/enums.js';

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function toPublicUser(user) {
  return {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_name,
  };
}

async function issueTokenPair(client, user, userAgent) {
  const accessToken = signAccessToken({ userId: user.user_id, roleName: user.role_name });

  const refreshTokenRaw = generateOpaqueToken();
  await authRepository.insertRefreshToken(client, {
    userId: user.user_id,
    tokenHash: hashOpaqueToken(refreshTokenRaw),
    expiresAt: addDays(new Date(), env.jwt.refreshExpiresInDays),
    userAgent,
  });

  return { accessToken, refreshToken: refreshTokenRaw };
}

export const authService = {
  /**
   * Workflow - register:
   *  1. Reject if the email is already in use.
   *  2. Hash the password (bcrypt, never stored/logged in plain text).
   *  3. Inside one transaction: insert the user row, insert their
   *     password, insert their user_roles row with role_id=1 (author) -
   *     if any of the three fails, all three roll back, so a user can
   *     never end up with no password or no role.
   *  4. Issue an access/refresh token pair immediately - registration is
   *     self-serve with no admin activation step.
   */
  async register({ fullName, email, password }, { userAgent } = {}) {
    if (await authRepository.emailExists(db, email)) {
      throw ApiError.conflict('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);

    const user = await db.transaction(async (trx) => {
      const created = await authRepository.insertUser(trx, { fullName, email });
      await authRepository.insertUserPassword(trx, { userId: created.user_id, passwordHash, createdBy: created.user_id });
      await authRepository.insertUserRoleAssignment(trx, { userId: created.user_id, roleId: 1, createdBy: created.user_id });
      return { ...created, role_name: ROLES.AUTHOR };
    });

    const tokens = await issueTokenPair(db, user, userAgent);
    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Workflow - login:
   *  1. Look up the user by email; a missing user and a wrong password
   *     both fail with the same generic message (don't reveal which
   *     emails are registered).
   *  2. Compare the submitted password against the stored bcrypt hash.
   *  3. Log the attempt (success or failure) to user_login_logs either way.
   *  4. On success: update last_login and issue a fresh token pair.
   */
  async login({ email, password }, { userAgent, ipAddress } = {}) {
    const user = await authRepository.findUserByEmail(db, email);
    const genericError = ApiError.unauthorized('Incorrect email or password.');

    if (!user) {
      throw genericError;
    }

    const hash = await authRepository.getPasswordHash(db, user.user_id);
    const passwordMatches = hash ? await comparePassword(password, hash) : false;

    if (!passwordMatches) {
      await authRepository.insertLoginLog(db, { userId: user.user_id, status: 'FAILURE', failureReason: 'Incorrect password', ipAddress });
      throw genericError;
    }

    if (!user.is_active) {
      throw ApiError.forbidden('This account has been deactivated. Contact an administrator.');
    }

    await authRepository.insertLoginLog(db, { userId: user.user_id, status: 'SUCCESS', ipAddress });
    await authRepository.touchLastLogin(db, user.user_id);

    const tokens = await issueTokenPair(db, user, userAgent);
    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Workflow - refresh (rotation):
   *  1. Hash the submitted raw refresh token and look up a matching row
   *     that isn't revoked and hasn't expired.
   *  2. Load the owning user fresh (role may have changed since the
   *     refresh token was issued).
   *  3. Inside one transaction: issue a new token pair, then revoke the
   *     presented refresh token, recording the new token's hash as
   *     replaced_by_hash on the old row. Rotation means a stolen-and-
   *     reused refresh token is detectable: presented again after this
   *     point, step 1's lookup simply fails (already revoked).
   */
  async refresh({ refreshToken }, { userAgent } = {}) {
    const tokenHash = hashOpaqueToken(refreshToken);
    const stored = await authRepository.findActiveRefreshToken(db, tokenHash);

    if (!stored) {
      throw ApiError.unauthorized('Refresh token is invalid, expired, or already used.');
    }

    const user = await authRepository.findUserById(db, stored.user_id);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized('Account is no longer active.');
    }

    return db.transaction(async (trx) => {
      const newTokens = await issueTokenPair(trx, user, userAgent);
      await authRepository.revokeRefreshToken(trx, tokenHash, hashOpaqueToken(newTokens.refreshToken));
      return { user: toPublicUser(user), ...newTokens };
    });
  },

  /**
   * Workflow - logout: hash the submitted refresh token and revoke it.
   * Always succeeds from the caller's point of view - it simply revokes
   * if found, no-ops otherwise.
   */
  async logout({ refreshToken }) {
    await authRepository.revokeRefreshToken(db, hashOpaqueToken(refreshToken));
  },

  /**
   * Workflow - validate: verify an access token's signature and expiry
   * and report back whether it's currently valid, without throwing - a
   * diagnostic/utility endpoint, distinct from the authenticate
   * middleware every protected route already runs.
   */
  async validate({ accessToken }) {
    try {
      const payload = verifyAccessToken(accessToken);
      return { valid: true, userId: Number(payload.sub), role: payload.role };
    } catch {
      return { valid: false };
    }
  },

  /**
   * Workflow - profile: return the caller's own record, derived from the
   * verified access token's subject claim (req.user.id), never from a
   * client-supplied id.
   */
  async getProfile(userId) {
    const user = await authRepository.findUserById(db, userId);
    if (!user) throw ApiError.notFound('User not found.');
    return toPublicUser(user);
  },

  /**
   * Workflow - forgot password:
   *  1. Look up the user by email. If none exists, the router still
   *     responds with the same generic message either way - this
   *     endpoint must never reveal whether an email is registered.
   *  2. Inside one transaction: invalidate any previously-issued, still-
   *     outstanding reset tokens for this user (so at most one reset
   *     link is ever live), then insert a fresh one.
   *  3. Email the raw token (embedded in a reset-password link) to the
   *     user. The raw token itself is never persisted anywhere - only
   *     this one email ever sees it.
   */
  async forgotPassword({ email }, { ipAddress } = {}) {
    const user = await authRepository.findUserByEmail(db, email);
    if (!user) {
      return; // router responds with the same generic message either way
    }

    const rawToken = generateOpaqueToken();
    await db.transaction(async (trx) => {
      await authRepository.invalidateOutstandingResetTokens(trx, user.user_id);
      await authRepository.insertPasswordResetToken(trx, {
        userId: user.user_id,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt: addMinutes(new Date(), env.passwordReset.expiresInMinutes),
        requestedIp: ipAddress,
      });
    });

    const resetLink = `${env.passwordReset.frontendUrl}?token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your DocFlow password',
      text: `Reset your password by opening this link (expires in ${env.passwordReset.expiresInMinutes} minutes): ${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
    });
  },

  /**
   * Workflow - reset password:
   *  1. Hash the submitted raw token and look up a matching row that
   *     hasn't been used and hasn't expired.
   *  2. Inside one transaction: overwrite user_passwords with the new
   *     hash, mark the reset token used (one-time use), and revoke every
   *     outstanding refresh token for this user - a password reset logs
   *     out every session, not just the one performing the reset.
   */
  async resetPassword({ token, newPassword }) {
    const tokenHash = hashOpaqueToken(token);
    const stored = await authRepository.findValidPasswordResetToken(db, tokenHash);

    if (!stored) {
      throw ApiError.badRequest('This reset link is invalid or has expired.');
    }

    const passwordHash = await hashPassword(newPassword);

    await db.transaction(async (trx) => {
      await authRepository.updatePasswordHash(trx, stored.user_id, passwordHash);
      await authRepository.markPasswordResetTokenUsed(trx, tokenHash);
      await authRepository.revokeAllRefreshTokensForUser(trx, stored.user_id);
    });
  },
};
