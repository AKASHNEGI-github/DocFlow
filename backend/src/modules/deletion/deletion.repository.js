/**
 * live_delete_requests needs unanimous approval from a fixed panel of
 * exactly 1 editor + 1 reviewer + 1 publisher - a fundamentally
 * different resolution rule from editorial/review/publication's
 * first-responder-wins (see utils/phaseWorkflow.js's header
 * comment for why that logic isn't reused here), so every query in this
 * file is purpose-built rather than going through the shared helper.
 */

const DOCUMENT_COLUMNS_ALIASED = `
  d.document_id, d.category, d.document_name, d.content, d.version_no, d.stage,
  d.root_document_id, d.created_by, d.created_at
`;

export const deletionRepository = {
  async listMyRequests(client, userId) {
    const sql = `
      SELECT ldr.delete_request_id, ldr.reason, ldr.status, ldr.created_at AS requested_at,
             ${DOCUMENT_COLUMNS_ALIASED},
             COALESCE(
               (SELECT json_agg(json_build_object('userId', u.user_id, 'fullName', u.full_name, 'role', a.approver_role, 'action', a.approver_action))
                FROM live_delete_request_approvers a
                JOIN users u ON u.user_id = a.approver_id
                WHERE a.delete_request_id = ldr.delete_request_id),
               '[]'
             ) AS approvers
      FROM live_delete_requests ldr
      JOIN documents d ON d.document_id = ldr.document_id
      WHERE ldr.created_by = ?
      ORDER BY ldr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  async listForApproval(client, userId) {
    const sql = `
      SELECT ldr.delete_request_id, ldr.reason, ldr.status, ldr.created_at AS requested_at,
             ${DOCUMENT_COLUMNS_ALIASED},
             a.approver_role AS my_role, a.approver_action AS my_action,
             au.user_id AS author_id, au.full_name AS author_name
      FROM live_delete_request_approvers a
      JOIN live_delete_requests ldr ON ldr.delete_request_id = a.delete_request_id
      JOIN documents d ON d.document_id = ldr.document_id
      JOIN users au ON au.user_id = ldr.created_by
      WHERE a.approver_id = ?
      ORDER BY ldr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  async getPendingRequestForDocument(client, documentId) {
    const sql = `SELECT * FROM live_delete_requests WHERE document_id = ? AND status = 'PENDING'`;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  /** Row-locked fetch, used by both cancel and action to serialize concurrent decisions on the same request. */
  async getByIdForUpdate(client, deleteRequestId) {
    const { rows } = await client.raw('SELECT * FROM live_delete_requests WHERE delete_request_id = ? FOR UPDATE', [deleteRequestId]);
    return rows[0] ?? null;
  },

  async insertRequest(client, { documentId, reason, createdBy }) {
    const sql = `
      INSERT INTO live_delete_requests (document_id, reason, status, created_by)
      VALUES (?, ?, 'PENDING', ?)
      RETURNING *
    `;
    const { rows } = await client.raw(sql, [documentId, reason, createdBy]);
    return rows[0];
  },

  /** Inserts exactly one approver row per role - uq_delete_request_role/uq_delete_request_user guard against duplicates at the database level too. */
  async insertApprovers(client, deleteRequestId, { editorId, reviewerId, publisherId }, createdBy) {
    const sql = `
      INSERT INTO live_delete_request_approvers (delete_request_id, approver_id, approver_role, approver_action, created_by)
      VALUES (?, ?, ?, 'PENDING', ?)
    `;
    await client.raw(sql, [deleteRequestId, editorId, 'EDITOR', createdBy]);
    await client.raw(sql, [deleteRequestId, reviewerId, 'REVIEWER', createdBy]);
    await client.raw(sql, [deleteRequestId, publisherId, 'PUBLISHER', createdBy]);
  },

  async getApproverRow(client, deleteRequestId, approverId) {
    const sql = `SELECT * FROM live_delete_request_approvers WHERE delete_request_id = ? AND approver_id = ?`;
    const { rows } = await client.raw(sql, [deleteRequestId, approverId]);
    return rows[0] ?? null;
  },

  async updateApproverAction(client, deleteRequestId, approverId, action, comments) {
    const sql = `
      UPDATE live_delete_request_approvers
      SET approver_action = ?, comments = ?, updated_by = ?, updated_at = now()
      WHERE delete_request_id = ? AND approver_id = ?
    `;
    await client.raw(sql, [action, comments ?? null, approverId, deleteRequestId, approverId]);
  },

  async countApproved(client, deleteRequestId) {
    const sql = `SELECT COUNT(*)::int AS approved_count FROM live_delete_request_approvers WHERE delete_request_id = ? AND approver_action = 'APPROVED'`;
    const { rows } = await client.raw(sql, [deleteRequestId]);
    return rows[0].approved_count;
  },

  async updateRequestStatus(client, deleteRequestId, status, updatedBy) {
    const sql = `
      UPDATE live_delete_requests
      SET status = ?, updated_by = ?, updated_at = now()
      WHERE delete_request_id = ?
      RETURNING *
    `;
    const { rows } = await client.raw(sql, [status, updatedBy, deleteRequestId]);
    return rows[0];
  },

  /** The cascade: every document in the family, and every document_live row in the family, marked deleted. */
  async cascadeDeleteFamily(client, rootDocumentId) {
    await client.raw('UPDATE documents SET is_deleted = true WHERE root_document_id = ?', [rootDocumentId]);
    await client.raw('UPDATE document_live SET is_deleted = true, is_current = false WHERE root_document_id = ?', [rootDocumentId]);
  },
};
