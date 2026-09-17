import { LATEST_PHASE_REQUEST_CTE } from '../../utils/phaseWorkflow.js';

/**
 * documents is the one table every phase module also reads/writes
 * directly for its own concerns (stage, is_locked, ...) - this file only
 * owns the generic document-level operations: create, edit, single-doc
 * fetch, "all of mine" (the Dashboard), delete, and the shared
 * current-phase/permission lookups every other module's service calls
 * into rather than re-deriving the Core Navigation Rule itself.
 */

const DOCUMENT_COLUMNS = `
  document_id, category, document_name, content, version_no, stage,
  parent_document_id, root_document_id, is_locked, is_deleted,
  created_by, created_at, updated_by, updated_at
`;

// Same column list, explicitly aliased to the `d` table alias used by
// queries that join documents against the latest_phase_request CTE.
const DOCUMENT_COLUMNS_ALIASED = `
  d.document_id, d.category, d.document_name, d.content, d.version_no, d.stage,
  d.parent_document_id, d.root_document_id, d.is_locked, d.is_deleted,
  d.created_by, d.created_at, d.updated_by, d.updated_at
`;

export const documentsRepository = {
  /**
   * Insert, then set root_document_id to the new row's own id (self-
   * reference for an original v1 - see the long comment in
   * database/knex/migrations/006_create_documents.js). Two statements
   * because the id doesn't exist until after the INSERT; caller wraps
   * both in a transaction.
   */
  async insertDocument(client, { category, documentName, content, createdBy }) {
    const insertSql = `
      INSERT INTO documents (category, document_name, content, version_no, stage, created_by)
      VALUES (?, ?, ?, 1, 'DRAFT', ?)
      RETURNING ${DOCUMENT_COLUMNS}
    `;
    const { rows } = await client.raw(insertSql, [category, documentName, content, createdBy]);
    const document = rows[0];

    const setRootSql = `UPDATE documents SET root_document_id = ? WHERE document_id = ? RETURNING ${DOCUMENT_COLUMNS}`;
    const { rows: rootRows } = await client.raw(setRootSql, [document.document_id, document.document_id]);
    return rootRows[0];
  },

  async getById(client, documentId) {
    const sql = `
      SELECT ${DOCUMENT_COLUMNS_ALIASED}, u.full_name AS creator_name
      FROM documents d
      JOIN users u ON u.user_id = d.created_by
      WHERE d.document_id = ? AND d.is_deleted = false
    `;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  /**
   * Live -> Upgrade: clones a new document_id into Draft, one version
   * ahead, linked back to its parent and family root. Unlike
   * insertDocument (a brand-new v1, root_document_id set to its own id
   * after insert), an upgrade already knows its root_document_id up
   * front - it's inheriting an existing family, not starting one.
   */
  async insertUpgradeVersion(client, { category, documentName, content, versionNo, parentDocumentId, rootDocumentId, createdBy }) {
    const sql = `
      INSERT INTO documents (category, document_name, content, version_no, stage, parent_document_id, root_document_id, created_by)
      VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?)
      RETURNING ${DOCUMENT_COLUMNS}
    `;
    const { rows } = await client.raw(sql, [category, documentName, content, versionNo, parentDocumentId, rootDocumentId, createdBy]);
    return rows[0];
  },

  async documentNameExists(client, documentName) {
    const { rows } = await client.raw('SELECT 1 FROM documents WHERE document_name = ? LIMIT 1', [documentName]);
    return rows.length > 0;
  },

  /**
   * Patches document_name and/or content plus updated_by/updated_at.
   * Used both for a plain author/editor content edit and, unchanged in
   * shape, would also cover any future field added to what's editable.
   */
  async updateDocument(client, documentId, { documentName, content, updatedBy }) {
    const sets = [];
    const bindings = [];
    if (documentName !== undefined) { sets.push('document_name = ?'); bindings.push(documentName); }
    if (content !== undefined) { sets.push('content = ?'); bindings.push(content); }
    sets.push('updated_by = ?', 'updated_at = now()');
    bindings.push(updatedBy);
    bindings.push(documentId);

    const sql = `UPDATE documents SET ${sets.join(', ')} WHERE document_id = ? RETURNING ${DOCUMENT_COLUMNS}`;
    const { rows } = await client.raw(sql, bindings);
    return rows[0] ?? null;
  },

  async updateStage(client, documentId, stage, updatedBy) {
    const sql = `
      UPDATE documents SET stage = ?, updated_by = ?, updated_at = now()
      WHERE document_id = ?
      RETURNING ${DOCUMENT_COLUMNS}
    `;
    const { rows } = await client.raw(sql, [stage, updatedBy, documentId]);
    return rows[0] ?? null;
  },

  async lockDocument(client, documentId) {
    await client.raw('UPDATE documents SET is_locked = true WHERE document_id = ?', [documentId]);
  },

  async softDelete(client, documentId) {
    const { rows } = await client.raw('UPDATE documents SET is_deleted = true WHERE document_id = ? RETURNING document_id', [documentId]);
    return rows[0] ?? null;
  },

  /**
   * Dashboard: every document the given user created, across every
   * stage, newest first - deliberately the simplest query in this file,
   * no phase derivation needed since Dashboard just shows raw stage +
   * whatever the latest request's status is, unfiltered by "which tab
   * would this show under".
   */
  async listMine(client, userId) {
    const sql = `
      ${LATEST_PHASE_REQUEST_CTE}
      SELECT ${DOCUMENT_COLUMNS_ALIASED},
             lpr.phase AS latest_phase, lpr.status AS latest_status
      FROM documents d
      LEFT JOIN latest_phase_request lpr ON lpr.document_id = d.document_id AND lpr.rn = 1
      WHERE d.created_by = ? AND d.is_deleted = false
      ORDER BY d.created_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  /**
   * The Core Navigation Rule, for one document: which phase (if any) its
   * latest request row belongs to, that row's status, and its id. Null
   * phase means no request has ever been raised - the document is
   * showing under Draft.
   */
  async getLatestPhaseInfo(client, documentId) {
    const sql = `
      ${LATEST_PHASE_REQUEST_CTE}
      SELECT phase, request_id, status
      FROM latest_phase_request
      WHERE document_id = ? AND rn = 1
    `;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  /**
   * True if this user is (or ever was) an assigned approver on any
   * editorial/review/publication request for this document - used to
   * decide read access to a non-Live document beyond its own owner.
   */
  async isAssignedApprover(client, documentId, userId) {
    const sql = `
      SELECT 1 FROM editorial_request_approvers era
        JOIN editorial_requests er ON er.editorial_request_id = era.editorial_request_id
        WHERE er.document_id = ? AND era.approver_id = ?
      UNION
      SELECT 1 FROM review_request_approvers rra
        JOIN review_requests rr ON rr.review_request_id = rra.review_request_id
        WHERE rr.document_id = ? AND rra.approver_id = ?
      UNION
      SELECT 1 FROM publication_request_approvers pra
        JOIN publication_requests pr ON pr.publication_request_id = pra.publication_request_id
        WHERE pr.document_id = ? AND pra.approver_id = ?
      LIMIT 1
    `;
    const { rows } = await client.raw(sql, [documentId, userId, documentId, userId, documentId, userId]);
    return rows.length > 0;
  },

  /**
   * Assigned editors specifically on the currently-Pending editorial
   * request for a document (used by the edit-while-pending permission
   * check - only an assigned EDITOR gets that, not any past approver on
   * any phase).
   */
  async getPendingEditorialApproverIds(client, documentId) {
    const sql = `
      SELECT era.approver_id
      FROM editorial_request_approvers era
      JOIN editorial_requests er ON er.editorial_request_id = era.editorial_request_id
      WHERE er.document_id = ? AND er.status = 'PENDING'
    `;
    const { rows } = await client.raw(sql, [documentId]);
    return rows.map((r) => r.approver_id);
  },

  /** Every version (document_id) belonging to the same family, oldest first. */
  async listFamily(client, rootDocumentId) {
    const sql = `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE root_document_id = ? ORDER BY version_no ASC`;
    const { rows } = await client.raw(sql, [rootDocumentId]);
    return rows;
  },

  /** Stage history timeline for the Document Detail view. */
  async getStageHistory(client, documentId) {
    const sql = `
      SELECT h.document_stage_history_id, h.from_stage, h.to_stage, h.old_status, h.new_status,
             h.action_at, u.user_id AS action_by_id, u.full_name AS action_by_name
      FROM document_stage_history h
      JOIN users u ON u.user_id = h.action_by
      WHERE h.document_id = ?
      ORDER BY h.action_at ASC
    `;
    const { rows } = await client.raw(sql, [documentId]);
    return rows;
  },
};
