import db from '../../config/db.js';
import { usersRepository } from './users.repository.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { ApiError } from '../../utils/ApiError.js';

function toDirectoryEntry(row) {
  return { userId: row.user_id, fullName: row.full_name, email: row.email, role: row.role_name };
}

export const usersService = {
  /**
   * Workflow - list: return the lightweight directory (id/name/email/
   * role), optionally narrowed to a single role. Powers both the
   * generic GET /users/all?role= picker and the phase-specific
   * /draft/editors, /editorial/reviewers, /review/publishers endpoints,
   * which each just call this with a fixed role.
   */
  async list(role) {
    const rows = await usersRepository.list(db, { role });
    return rows.map(toDirectoryEntry);
  },

  async getById(userId) {
    const row = await usersRepository.getById(db, userId);
    if (!row) throw ApiError.notFound('User not found.');
    return toDirectoryEntry(row);
  },

  /**
   * Workflow - updateMe: patches only fullName/email on the CALLER's own
   * row (userId always comes from req.user.id, never a client-supplied
   * id - see users.router.js). Role is never accepted here; changing a
   * role is exclusively an admin action (modules/admin).
   */
  async updateMe(userId, patch) {
    const updated = await usersRepository.updateBasicInfo(db, userId, patch);
    if (!updated) throw ApiError.notFound('User not found.');
    return { userId: updated.user_id, fullName: updated.full_name, email: updated.email };
  },

  /**
   * Workflow - changePassword:
   *  1. Load the caller's current hash and verify currentPassword
   *     against it - proves they still control the account even though
   *     they're already authenticated (protects against a hijacked,
   *     still-logged-in session).
   *  2. Hash and store the new password.
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const hash = await usersRepository.getPasswordHash(db, userId);
    const matches = hash ? await comparePassword(currentPassword, hash) : false;
    if (!matches) {
      throw ApiError.badRequest('Current password is incorrect.');
    }
    const newHash = await hashPassword(newPassword);
    await usersRepository.updatePasswordHash(db, userId, newHash);
  },
};
