/**
 * Every function takes `client` as its first argument - either the
 * shared db connection (config/db.js) for a standalone statement, or an
 * active transaction (db.transaction(async trx => ...)) when the caller
 * needs several of these to commit or roll back together. Every query is
 * raw parameterized SQL via client.raw(sql, bindings) - `?` binds a
 * value, `??` binds an identifier - never an ORM, never string-built SQL.
 */

const USER_WITH_ROLE_SELECT = `
  SELECT
    u.user_id, u.full_name, u.email, u.sso_id, u.last_login,
    u.is_active, u.is_deleted,
    r.role_id, r.role_name
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.user_id
  JOIN roles r ON r.role_id = ur.role_id
`;

export const authRepository = {
  async findUserByEmail(client, email) {
    const sql = `${USER_WITH_ROLE_SELECT} WHERE u.email = ? AND u.is_deleted = false`;
    const { rows } = await client.raw(sql, [email]);
    return rows[0] ?? null;
  },

  async findUserById(client, userId) {
    const sql = `${USER_WITH_ROLE_SELECT} WHERE u.user_id = ? AND u.is_deleted = false`;
    const { rows } = await client.raw(sql, [userId]);
    return rows[0] ?? null;
  },

  async emailExists(client, email) {
    const { rows } = await client.raw('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
  },

  // --- Registration (3 statements - caller wraps these in a transaction) ---

  async insertUser(client, { fullName, email }) {
    const sql = `
      INSERT INTO users (full_name, email, created_by)
      VALUES (?, ?, NULL)
      RETURNING user_id, full_name, email
    `;
    const { rows } = await client.raw(sql, [fullName, email]);
    return rows[0];
  },

  async insertUserPassword(client, { userId, passwordHash, createdBy }) {
    const sql = `
      INSERT INTO user_passwords (user_id, hash_password, created_by)
      VALUES (?, ?, ?)
    `;
    await client.raw(sql, [userId, passwordHash, createdBy]);
  },

  async insertUserRoleAssignment(client, { userId, roleId, createdBy }) {
    const sql = `
      INSERT INTO user_roles (user_id, role_id, created_by)
      VALUES (?, ?, ?)
    `;
    await client.raw(sql, [userId, roleId, createdBy]);
  },

  // --- Password ---------------------------------------------------------

  async getPasswordHash(client, userId) {
    const { rows } = await client.raw('SELECT hash_password FROM user_passwords WHERE user_id = ?', [userId]);
    return rows[0]?.hash_password ?? null;
  },

  async updatePasswordHash(client, userId, passwordHash) {
    const sql = `
      UPDATE user_passwords
      SET hash_password = ?, updated_by = ?, updated_at = now()
      WHERE user_id = ?
    `;
    await client.raw(sql, [passwordHash, userId, userId]);
  },

  // --- Login bookkeeping --------------------------------------------------

  async touchLastLogin(client, userId) {
    await client.raw('UPDATE users SET last_login = now() WHERE user_id = ?', [userId]);
  },

  async insertLoginLog(client, { userId, status, failureReason, ipAddress }) {
    const sql = `
      INSERT INTO user_login_logs (user_id, login_status, failure_reason, ip_address, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    await client.raw(sql, [userId, status, failureReason ?? null, ipAddress ?? null, userId]);
  },

  // --- Refresh tokens -----------------------------------------------------

  async insertRefreshToken(client, { userId, tokenHash, expiresAt, userAgent }) {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
      VALUES (?, ?, ?, ?)
    `;
    await client.raw(sql, [userId, tokenHash, expiresAt, userAgent ?? null]);
  },

  async findActiveRefreshToken(client, tokenHash) {
    const sql = `
      SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > now()
    `;
    const { rows } = await client.raw(sql, [tokenHash]);
    return rows[0] ?? null;
  },

  async revokeRefreshToken(client, tokenHash, replacedByHash = null) {
    const sql = `
      UPDATE refresh_tokens
      SET revoked_at = now(), replaced_by_hash = ?, updated_at = now()
      WHERE token_hash = ?
    `;
    await client.raw(sql, [replacedByHash, tokenHash]);
  },

  async revokeAllRefreshTokensForUser(client, userId) {
    const sql = `
      UPDATE refresh_tokens
      SET revoked_at = now(), updated_at = now()
      WHERE user_id = ? AND revoked_at IS NULL
    `;
    await client.raw(sql, [userId]);
  },

  // --- Password reset -------------------------------------------------

  async invalidateOutstandingResetTokens(client, userId) {
    const sql = `UPDATE password_reset_tokens SET used_at = now() WHERE user_id = ? AND used_at IS NULL`;
    await client.raw(sql, [userId]);
  },

  async insertPasswordResetToken(client, { userId, tokenHash, expiresAt, requestedIp }) {
    const sql = `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
      VALUES (?, ?, ?, ?)
    `;
    await client.raw(sql, [userId, tokenHash, expiresAt, requestedIp ?? null]);
  },

  async findValidPasswordResetToken(client, tokenHash) {
    const sql = `
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > now()
    `;
    const { rows } = await client.raw(sql, [tokenHash]);
    return rows[0] ?? null;
  },

  async markPasswordResetTokenUsed(client, tokenHash) {
    await client.raw('UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = ?', [tokenHash]);
  },
};
