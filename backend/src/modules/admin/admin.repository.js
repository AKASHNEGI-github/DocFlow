/**
 * Full account detail (SSO ID, last login, active flag, audit columns) -
 * the privileged counterpart to users.repository.js's lightweight
 * directory. Every function takes `client` (db connection or active
 * transaction) as its first argument and runs raw parameterized SQL.
 */

const FULL_USER_SELECT = `
  SELECT
    u.user_id, u.full_name, u.email, u.sso_id, u.last_login,
    u.is_active, u.is_deleted, u.created_at,
    r.role_id, r.role_name
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.user_id
  JOIN roles r ON r.role_id = ur.role_id
  WHERE u.is_deleted = false
`;

export const adminRepository = {
  async listAll(client) {
    const { rows } = await client.raw(`${FULL_USER_SELECT} ORDER BY u.created_at DESC`);
    return rows;
  },

  async getById(client, userId) {
    const { rows } = await client.raw(`${FULL_USER_SELECT} AND u.user_id = ?`, [userId]);
    return rows[0] ?? null;
  },

  async listRoles(client) {
    const sql = `SELECT role_id, role_name, role_level, description FROM roles WHERE is_deleted = false ORDER BY role_id ASC`;
    const { rows } = await client.raw(sql);
    return rows;
  },

  async emailExists(client, email) {
    const { rows } = await client.raw('SELECT 1 FROM users WHERE email = ? AND is_deleted = false LIMIT 1', [email]);
    return rows.length > 0;
  },

  // --- Create user (3 statements - caller wraps these in a transaction) ---

  async insertUser(client, { fullName, email, ssoId, createdBy }) {
    const sql = `
      INSERT INTO users (full_name, email, sso_id, created_by)
      VALUES (?, ?, ?, ?)
      RETURNING user_id, full_name, email, sso_id
    `;
    const { rows } = await client.raw(sql, [fullName, email, ssoId ?? null, createdBy]);
    return rows[0];
  },

  async insertUserPassword(client, { userId, passwordHash, createdBy }) {
    const sql = `INSERT INTO user_passwords (user_id, hash_password, created_by) VALUES (?, ?, ?)`;
    await client.raw(sql, [userId, passwordHash, createdBy]);
  },

  async insertUserRoleAssignment(client, { userId, roleId, createdBy }) {
    const sql = `INSERT INTO user_roles (user_id, role_id, created_by) VALUES (?, ?, ?)`;
    await client.raw(sql, [userId, roleId, createdBy]);
  },

  // --- Edit / role / delete ------------------------------------------------

  async updateBasicInfo(client, userId, { fullName, email, ssoId, isActive }) {
    const sets = [];
    const bindings = [];
    if (fullName !== undefined) { sets.push('full_name = ?'); bindings.push(fullName); }
    if (email !== undefined) { sets.push('email = ?'); bindings.push(email); }
    if (ssoId !== undefined) { sets.push('sso_id = ?'); bindings.push(ssoId); }
    if (isActive !== undefined) { sets.push('is_active = ?'); bindings.push(isActive); }

    // The route this actually serves (PATCH /admin/users/:id) already
    // rejects an empty body at the schema layer (see the .refine() on
    // updateUser in admin.schema.js), so this shouldn't be reachable
    // today - but that means this function's own safety currently
    // depends entirely on every future caller remembering that
    // validation exists elsewhere and staying in sync with it. An empty
    // `sets` here would otherwise build `UPDATE users SET  WHERE
    // user_id = ?` — invalid SQL, surfaced as a raw 500 instead of the
    // clean 400 the schema already means to guarantee. Falling back to
    // just re-reading the current row keeps this function correct on
    // its own terms regardless of what any particular caller validated.
    if (sets.length === 0) return adminRepository.getById(client, userId);

    bindings.push(userId);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE user_id = ? RETURNING user_id`;
    const { rows } = await client.raw(sql, bindings);
    return rows[0] ?? null;
  },

  async findRoleIdByName(client, roleName) {
    const { rows } = await client.raw('SELECT role_id FROM roles WHERE role_name = ?', [roleName]);
    return rows[0]?.role_id ?? null;
  },

  async updateUserRole(client, userId, roleId, updatedBy) {
    const sql = `
      UPDATE user_roles
      SET role_id = ?, updated_by = ?, updated_at = now()
      WHERE user_id = ?
      RETURNING user_id
    `;
    const { rows } = await client.raw(sql, [roleId, updatedBy, userId]);
    return rows[0] ?? null;
  },

  /**
   * The only way any user is ever deleted (soft): is_deleted = true.
   * Distinct from is_active, which updateBasicInfo above already
   * toggles independently - activating/deactivating an account keeps it
   * fully visible and recoverable from the users list, while deleting
   * it removes it from listAll/getById entirely (both filter on
   * is_deleted = false) with no admin-facing way back, matching how
   * document deletion works elsewhere in this app.
   */
  async softDeleteUser(client, userId) {
    const sql = `UPDATE users SET is_deleted = true WHERE user_id = ? RETURNING user_id`;
    const { rows } = await client.raw(sql, [userId]);
    return rows[0] ?? null;
  },
};
