/**
 * Deliberately lightweight - id/name/email/role only. This is the
 * directory every "Created By" / "Reviewer" / "Assigned By" column and
 * every approver picker (editors/reviewers/publishers lists) reads from.
 * Full account detail (SSO ID, last login, active flag, audit columns)
 * stays behind the admin module - see modules/admin/admin.repository.js.
 *
 * Every function takes `client` (db connection or active transaction)
 * as its first argument and runs raw parameterized SQL through
 * client.raw(sql, bindings).
 */

const DIRECTORY_SELECT = `
  SELECT u.user_id, u.full_name, u.email, r.role_name
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.user_id
  JOIN roles r ON r.role_id = ur.role_id
  WHERE u.is_deleted = false AND u.is_active = true
`;

export const usersRepository = {
  async list(client, { role } = {}) {
    let sql = `${DIRECTORY_SELECT}`;
    const bindings = [];
    if (role) {
      sql += ' AND r.role_name = ?';
      bindings.push(role);
    }
    sql += ' ORDER BY u.full_name ASC';
    const { rows } = await client.raw(sql, bindings);
    return rows;
  },

  async getById(client, userId) {
    const sql = `${DIRECTORY_SELECT} AND u.user_id = ?`;
    const { rows } = await client.raw(sql, [userId]);
    return rows[0] ?? null;
  },

  async updateBasicInfo(client, userId, { fullName, email }) {
    const sets = [];
    const bindings = [];
    if (fullName !== undefined) {
      sets.push('full_name = ?');
      bindings.push(fullName);
    }
    if (email !== undefined) {
      sets.push('email = ?');
      bindings.push(email);
    }

    // Same reasoning as admin.repository.js's updateBasicInfo: the route
    // this serves (PATCH /users/me) already rejects an empty body via
    // usersSchema.updateMe's .refine() check, so this shouldn't be
    // reachable today - but an empty `sets` here would otherwise build
    // invalid SQL (`UPDATE users SET  WHERE user_id = ?`), and this
    // function's correctness shouldn't depend on every future caller
    // remembering that validation exists elsewhere. Falling back to the
    // current row keeps this correct on its own terms either way.
    if (sets.length === 0) return usersRepository.getById(client, userId);

    bindings.push(userId);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE user_id = ? RETURNING user_id, full_name, email`;
    const { rows } = await client.raw(sql, bindings);
    return rows[0] ?? null;
  },

  async getPasswordHash(client, userId) {
    const { rows } = await client.raw('SELECT hash_password FROM user_passwords WHERE user_id = ?', [userId]);
    return rows[0]?.hash_password ?? null;
  },

  /**
   * Used whenever a promote action assigns approvers (editors/reviewers/
   * publishers) or a deletion request assigns its 1-of-each panel: given
   * a list of user ids and the role they're expected to hold, returns
   * only the ids that actually exist, are active, and hold that role -
   * the caller compares the returned count against the input to reject
   * any id that doesn't qualify, rather than silently assigning someone
   * who was deactivated or never held that role.
   */
  async findValidIdsWithRole(client, userIds, role) {
    if (userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(', ');
    const sql = `
      SELECT u.user_id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE u.user_id IN (${placeholders}) AND u.is_active = true AND u.is_deleted = false AND r.role_name = ?
    `;
    const { rows } = await client.raw(sql, [...userIds, role]);
    return rows.map((r) => r.user_id);
  },

  async updatePasswordHash(client, userId, passwordHash) {
    const sql = `
      UPDATE user_passwords
      SET hash_password = ?, updated_by = ?, updated_at = now()
      WHERE user_id = ?
    `;
    await client.raw(sql, [passwordHash, userId, userId]);
  },
};
