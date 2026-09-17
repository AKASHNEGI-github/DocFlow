/**
 * document_live is written to in exactly two places: here (on publish,
 * called from modules/publication/publication.service.js) and never
 * anywhere else - is_current is only ever flipped as part of a publish
 * or an approved deletion (modules/deletion), both of which import from
 * this file rather than touching document_live directly themselves.
 */

const LIVE_COLUMNS = `
  document_live_id, document_id, root_document_id, category, document_name,
  content, version_no, is_current, published_by, published_at, is_deleted
`;

export const liveRepository = {
  /**
   * Flips the previous current version of this family (if any) to
   * is_current=false. MUST run, in the same transaction, before
   * insertLiveVersion below - the partial unique index
   * uq_document_live_one_current_per_family rejects an insert that would
   * leave two rows for the same root_document_id both current, and
   * Postgres checks that constraint immediately, not deferred.
   */
  async flipCurrentToFalse(client, rootDocumentId) {
    await client.raw('UPDATE document_live SET is_current = false WHERE root_document_id = ? AND is_current = true', [rootDocumentId]);
  },

  async insertLiveVersion(client, { documentId, rootDocumentId, category, documentName, content, versionNo, publishedBy }) {
    const sql = `
      INSERT INTO document_live (document_id, root_document_id, category, document_name, content, version_no, is_current, published_by)
      VALUES (?, ?, ?, ?, ?, ?, true, ?)
      RETURNING ${LIVE_COLUMNS}
    `;
    const { rows } = await client.raw(sql, [documentId, rootDocumentId, category, documentName, content, versionNo, publishedBy]);
    return rows[0];
  },

  async getByDocumentId(client, documentId) {
    const sql = `SELECT ${LIVE_COLUMNS} FROM document_live WHERE document_id = ? AND is_deleted = false`;
    const { rows } = await client.raw(sql, [documentId]);
    return rows[0] ?? null;
  },

  async getCurrentByRoot(client, rootDocumentId) {
    const sql = `SELECT ${LIVE_COLUMNS} FROM document_live WHERE root_document_id = ? AND is_current = true AND is_deleted = false`;
    const { rows } = await client.raw(sql, [rootDocumentId]);
    return rows[0] ?? null;
  },

  /**
   * Home: every current, non-deleted live document from every author -
   * the public feed. No ownership filter at all.
   */
  async listPublicFeed(client) {
    const sql = `
      SELECT dl.${LIVE_COLUMNS.split(',').map((c) => c.trim()).join(', dl.')},
             u.user_id AS author_id, u.full_name AS author_name
      FROM document_live dl
      JOIN documents d ON d.document_id = dl.document_id
      JOIN users u ON u.user_id = d.created_by
      WHERE dl.is_current = true AND dl.is_deleted = false
      ORDER BY dl.published_at DESC
    `;
    const { rows } = await client.raw(sql);
    return rows;
  },

  /**
   * Live (personal): current, non-deleted live documents whose CURRENT
   * version was created by this user - ownership always keyed off the
   * specific document_id's own creator, same rule as everywhere else in
   * the app, not a family-level concept.
   */
  async listMine(client, userId) {
    const sql = `
      SELECT dl.${LIVE_COLUMNS.split(',').map((c) => c.trim()).join(', dl.')}
      FROM document_live dl
      JOIN documents d ON d.document_id = dl.document_id
      WHERE dl.is_current = true AND dl.is_deleted = false AND d.created_by = ?
      ORDER BY dl.published_at DESC
    `;
    const { rows } = await client.raw(sql, [userId]);
    return rows;
  },

  /** True if any OTHER version in this family is currently anywhere Draft..Publication (not yet Live, not deleted). */
  async hasInFlightVersion(client, rootDocumentId, excludingDocumentId) {
    const sql = `
      SELECT 1 FROM documents
      WHERE root_document_id = ? AND document_id != ? AND stage != 'LIVE' AND is_deleted = false
      LIMIT 1
    `;
    const { rows } = await client.raw(sql, [rootDocumentId, excludingDocumentId]);
    return rows.length > 0;
  },

  /** True if this specific live document has a currently-Pending deletion request. */
  async hasPendingDeletionRequest(client, documentId) {
    const sql = `SELECT 1 FROM live_delete_requests WHERE document_id = ? AND status = 'PENDING' LIMIT 1`;
    const { rows } = await client.raw(sql, [documentId]);
    return rows.length > 0;
  },

  /** Approved-deletion cascade support: every live row (current or not) across the whole family. */
  async listFamilyLiveRows(client, rootDocumentId) {
    const sql = `SELECT ${LIVE_COLUMNS} FROM document_live WHERE root_document_id = ?`;
    const { rows } = await client.raw(sql, [rootDocumentId]);
    return rows;
  },

  async softDeleteFamily(client, rootDocumentId) {
    await client.raw('UPDATE document_live SET is_deleted = true, is_current = false WHERE root_document_id = ?', [rootDocumentId]);
  },
};
