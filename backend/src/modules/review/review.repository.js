import { LATEST_PHASE_REQUEST_CTE } from '../../utils/phaseWorkflow.js';

const DOCUMENT_COLUMNS_ALIASED = `
  d.document_id, d.category, d.document_name, d.content, d.version_no, d.stage,
  d.parent_document_id, d.root_document_id, d.is_locked, d.is_deleted,
  d.created_by, d.created_at, d.updated_by, d.updated_at
`;

const APPROVERS_SUBQUERY = `
  (SELECT json_agg(json_build_object('userId', u.user_id, 'fullName', u.full_name, 'action', rra.approver_action))
   FROM review_request_approvers rra
   JOIN users u ON u.user_id = rra.approver_id
   WHERE rra.review_request_id = lpr.request_id)
`;

export const reviewRepository = {
  /** My Requests: see editorial.repository.js's listMyRequests for the full rationale - identical shape, one phase up. */
  async listMyRequests(client, userId) {
    const sql = `
      ${LATEST_PHASE_REQUEST_CTE}
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             lpr.status AS request_status, lpr.request_id AS review_request_id,
             COALESCE(${APPROVERS_SUBQUERY}, '[]') AS approvers
      FROM documents d
      JOIN latest_phase_request lpr ON lpr.document_id = d.document_id AND lpr.rn = 1
      WHERE d.created_by = ? AND d.is_deleted = false AND lpr.phase = 'REVIEW'
      ORDER BY lpr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  /** Requests For Approval: see editorial.repository.js's listForApproval for the full rationale. */
  async listForApproval(client, userId) {
    const sql = `
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             rr.status AS request_status, rr.review_request_id, rr.created_at AS requested_at,
             rra.approver_action AS my_action,
             au.user_id AS author_id, au.full_name AS author_name
      FROM review_request_approvers rra
      JOIN review_requests rr ON rr.review_request_id = rra.review_request_id
      JOIN documents d ON d.document_id = rr.document_id
      JOIN users au ON au.user_id = d.created_by
      WHERE rra.approver_id = ? AND d.is_deleted = false
      ORDER BY rr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  async getPendingRequest(client, documentId) {
    const sql = `SELECT * FROM review_requests WHERE document_id = ? AND status = 'PENDING'`;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  async cancelRequest(client, reviewRequestId, cancelledBy) {
    const sql = `
      UPDATE review_requests
      SET status = 'CANCELLED', updated_by = ?, updated_at = now()
      WHERE review_request_id = ?
      RETURNING *
    `;
    const { rows } = await client.raw(sql, [cancelledBy, reviewRequestId]);
    return rows[0] ?? null;
  },
};
