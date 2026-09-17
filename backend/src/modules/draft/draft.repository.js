import { LATEST_PHASE_REQUEST_CTE } from '../../utils/phaseWorkflow.js';

const DOCUMENT_COLUMNS_ALIASED = `
  d.document_id, d.category, d.document_name, d.content, d.version_no, d.stage,
  d.parent_document_id, d.root_document_id, d.is_locked, d.is_deleted,
  d.created_by, d.created_at, d.updated_by, d.updated_at
`;

export const draftRepository = {
  /**
   * "My Documents": documents this user created that have NEVER had a
   * request raised for them (no matching row at all in the shared
   * latest-phase CTE - the LEFT JOIN ... IS NULL below). Per the Core
   * Navigation Rule, everything else - including a document rejected or
   * cancelled back down to Draft-equivalent stage - keeps showing under
   * whichever phase it was rejected/cancelled at, not here.
   */
  async listMyDraftDocuments(client, userId) {
    const sql = `
      ${LATEST_PHASE_REQUEST_CTE}
      SELECT ${DOCUMENT_COLUMNS_ALIASED}
      FROM documents d
      LEFT JOIN latest_phase_request lpr ON lpr.document_id = d.document_id AND lpr.rn = 1
      WHERE d.created_by = ?
        AND d.is_deleted = false
        AND d.stage = 'DRAFT'
        AND lpr.document_id IS NULL
      ORDER BY d.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },
};
