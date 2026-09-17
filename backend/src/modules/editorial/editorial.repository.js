import { LATEST_PHASE_REQUEST_CTE } from '../../utils/phaseWorkflow.js';

const DOCUMENT_COLUMNS_ALIASED = `
  d.document_id, d.category, d.document_name, d.content, d.version_no, d.stage,
  d.parent_document_id, d.root_document_id, d.is_locked, d.is_deleted,
  d.created_by, d.created_at, d.updated_by, d.updated_at
`;

// Assigned editors for a request, as a JSON array - null (not []) when
// the aggregate has nothing to group, which is why callers coalesce it.
const APPROVERS_SUBQUERY = `
  (SELECT json_agg(json_build_object('userId', u.user_id, 'fullName', u.full_name, 'action', era.approver_action))
   FROM editorial_request_approvers era
   JOIN users u ON u.user_id = era.approver_id
   WHERE era.editorial_request_id = lpr.request_id)
`;

export const editorialRepository = {
  /**
   * My Requests: documents this user authored whose latest request (per
   * the Core Navigation Rule CTE) sits in editorial_requests - covers
   * Pending, Approved, Rejected and Cancelled all in one list, exactly
   * as the "My Requests" tab is meant to.
   */
  async listMyRequests(client, userId) {
    const sql = `
      ${LATEST_PHASE_REQUEST_CTE}
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             lpr.status AS request_status, lpr.request_id AS editorial_request_id,
             COALESCE(${APPROVERS_SUBQUERY}, '[]') AS approvers
      FROM documents d
      JOIN latest_phase_request lpr ON lpr.document_id = d.document_id AND lpr.rn = 1
      WHERE d.created_by = ? AND d.is_deleted = false AND lpr.phase = 'EDITORIAL'
      ORDER BY lpr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  /**
   * Requests For Approval: every editorial request this user was ever
   * assigned to as an editor, resolved or not - scoped strictly to rows
   * where THIS user is the assigned approver (never every pending
   * request at the phase), per the data-privacy decision made during
   * design. One row per request, not deduplicated by document, so a
   * document rejected and re-raised to the same editor shows both the
   * old resolved request and the new pending one.
   */
  async listForApproval(client, userId) {
    const sql = `
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             er.status AS request_status, er.editorial_request_id, er.created_at AS requested_at,
             era.approver_action AS my_action,
             au.user_id AS author_id, au.full_name AS author_name
      FROM editorial_request_approvers era
      JOIN editorial_requests er ON er.editorial_request_id = era.editorial_request_id
      JOIN documents d ON d.document_id = er.document_id
      JOIN users au ON au.user_id = d.created_by
      WHERE era.approver_id = ? AND d.is_deleted = false
      ORDER BY er.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  async getPendingRequest(client, documentId) {
    const sql = `SELECT * FROM editorial_requests WHERE document_id = ? AND status = 'PENDING'`;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  async cancelRequest(client, editorialRequestId, cancelledBy) {
    const sql = `
      UPDATE editorial_requests
      SET status = 'CANCELLED', updated_by = ?, updated_at = now()
      WHERE editorial_request_id = ?
      RETURNING *
    `;
    const { rows } = await client.raw(sql, [cancelledBy, editorialRequestId]);
    return rows[0] ?? null;
  },
};
