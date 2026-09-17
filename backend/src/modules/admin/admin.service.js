import db from '../../config/db.js';
import { adminRepository } from './admin.repository.js';
import { authRepository } from '../auth/auth.repository.js';
import { hashPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/ApiError.js';

function toFullUser(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    ssoId: row.sso_id,
    lastLogin: row.last_login,
    isActive: row.is_active,
    createdAt: row.created_at,
    role: row.role_name,
  };
}

export const adminService = {
  async listUsers() {
    const rows = await adminRepository.listAll(db);
    return rows.map(toFullUser);
  },

  async listRoles() {
    return adminRepository.listRoles(db);
  },

  async getById(userId) {
    const row = await adminRepository.getById(db, userId);
    if (!row) throw ApiError.notFound('User not found.');
    return toFullUser(row);
  },

  /**
   * Workflow - createUser (this is Add User on the admin screen, the one
   * capability register() deliberately doesn't have: choosing the new
   * account's role up front, editor/reviewer/publisher/admin included,
   * not just the self-service default of author):
   *  1. Reject if the email is already in use.
   *  2. Look up the target role's id by name.
   *  3. Hash the password.
   *  4. Inside one transaction: insert the user (created_by = the admin
   *     performing this), insert their password, insert their role
   *     assignment.
   */
  async createUser({ fullName, email, password, role, ssoId }, createdBy) {
    if (await adminRepository.emailExists(db, email)) {
      throw ApiError.conflict('An account with this email already exists.');
    }

    const roleId = await adminRepository.findRoleIdByName(db, role);
    if (!roleId) throw ApiError.badRequest('Unknown role.');

    const passwordHash = await hashPassword(password);

    const user = await db.transaction(async (trx) => {
      const created = await adminRepository.insertUser(trx, { fullName, email, ssoId, createdBy });
      await adminRepository.insertUserPassword(trx, { userId: created.user_id, passwordHash, createdBy });
      await adminRepository.insertUserRoleAssignment(trx, { userId: created.user_id, roleId, createdBy });
      return created;
    });

    return { userId: user.user_id, fullName: user.full_name, email: user.email, ssoId: user.sso_id, role };
  },

  /**
   * Workflow - updateUser: patches fullName/email/ssoId/isActive on any
   * user. Deliberately does NOT accept role here - role changes go
   * through updateRole below, its own explicit action with its own
   * audit columns (user_roles.updated_by/updated_at), matching the
   * original API's separate PUT /admin/role/:user_id.
   */
  async updateUser(userId, patch) {
    const updated = await adminRepository.updateBasicInfo(db, userId, patch);
    if (!updated) throw ApiError.notFound('User not found.');
    return this.getById(userId);
  },

  /**
   * Workflow - updateRole: the only way any user's role ever changes
   * (self-service PUT /users/me never accepts a role field). Looks up
   * the target role's id, then updates the user's single user_roles row
   * in place (no history table for this - see the comment in
   * database/knex/migrations/005_create_user_roles.js).
   */
  async updateRole(userId, role, updatedBy) {
    const roleId = await adminRepository.findRoleIdByName(db, role);
    if (!roleId) throw ApiError.badRequest('Unknown role.');

    const updated = await adminRepository.updateUserRole(db, userId, roleId, updatedBy);
    if (!updated) throw ApiError.notFound('User not found.');
    return this.getById(userId);
  },

  /**
   * Workflow - deleteUser: admin-only (per the decision that no user,
   * including a peer admin, can delete another user any other way -
   * DELETE /users/:id was removed entirely). Soft-deletes
   * (is_deleted = true) - the account disappears from listUsers
   * entirely, with no admin-facing way back, same as document deletion
   * elsewhere in this app. This is deliberately different from
   * deactivating an account (updateUser({ isActive: false }), available
   * from the Edit User form), which keeps it visible and reversible -
   * delete is the one-way action, deactivate is the reversible one. Also
   * revokes every outstanding refresh token so any active session for
   * that account is logged out immediately rather than staying valid
   * until its access token naturally expires.
   */
  async deleteUser(userId) {
    const deleted = await adminRepository.softDeleteUser(db, userId);
    if (!deleted) throw ApiError.notFound('User not found.');
    await authRepository.revokeAllRefreshTokensForUser(db, userId);
  },
};
