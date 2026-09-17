import { LATEST_PHASE_REQUEST_CTE } from '../../utils/phaseWorkflow.js';

const DOCUMENT_COLUMNS_ALIASED = `
  d.document_id, d.category, d.document_name, d.content, d.version_no, d.stage,
  d.parent_document_id, d.root_document_id, d.is_locked, d.is_deleted,
  d.created_by, d.created_at, d.updated_by, d.updated_at
`;

const APPROVERS_SUBQUERY = `
  (SELECT json_agg(json_build_object('userId', u.user_id, 'fullName', u.full_name, 'action', pra.approver_action))
   FROM publication_request_approvers pra
   JOIN users u ON u.user_id = pra.approver_id
   WHERE pra.publication_request_id = lpr.request_id)
`;

export const publicationRepository = {
  /**
   * My Requests: documents whose latest request sits in
   * publication_requests. Approved rows never actually accumulate here -
   * a publisher's Approve publishes immediately (see
   * publication.service.js), so the only outcomes a document lingers
   * under at this phase are Pending and Rejected (=unpublished).
   */
  async listMyRequests(client, userId) {
    const sql = `
      ${LATEST_PHASE_REQUEST_CTE}
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             lpr.status AS request_status, lpr.request_id AS publication_request_id,
             COALESCE(${APPROVERS_SUBQUERY}, '[]') AS approvers
      FROM documents d
      JOIN latest_phase_request lpr ON lpr.document_id = d.document_id AND lpr.rn = 1
      WHERE d.created_by = ? AND d.is_deleted = false AND lpr.phase = 'PUBLICATION'
      ORDER BY lpr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  async listForApproval(client, userId) {
    const sql = `
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             pr.status AS request_status, pr.publication_request_id, pr.created_at AS requested_at,
             pra.approver_action AS my_action,
             au.user_id AS author_id, au.full_name AS author_name
      FROM publication_request_approvers pra
      JOIN publication_requests pr ON pr.publication_request_id = pra.publication_request_id
      JOIN documents d ON d.document_id = pr.document_id
      JOIN users au ON au.user_id = d.created_by
      WHERE pra.approver_id = ? AND d.is_deleted = false
      ORDER BY pr.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  async getPendingRequest(client, documentId) {
    const sql = `SELECT * FROM publication_requests WHERE document_id = ? AND status = 'PENDING'`;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  async cancelRequest(client, publicationRequestId, cancelledBy) {
    const sql = `
      UPDATE publication_requests
      SET status = 'CANCELLED', updated_by = ?, updated_at = now()
      WHERE publication_request_id = ?
      RETURNING *
    `;
    const { rows } = await client.raw(sql, [cancelledBy, publicationRequestId]);
    return rows[0] ?? null;
  },
};
