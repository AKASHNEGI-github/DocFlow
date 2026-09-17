import { REQUEST_STATUS, APPROVER_ACTION } from '../shared/constants/enums.js';
import { ApiError } from './ApiError.js';

/**
 * The single SQL implementation of the "Core Navigation Rule" agreed
 * during design: a document's displayed phase is whichever of
 * editorial_requests / review_requests / publication_requests holds its
 * overall most recent row (by created_at), REGARDLESS of that row's
 * status - a Rejected or Cancelled request is never bounced back to a
 * lower phase, it keeps showing at the phase it was rejected/cancelled,
 * exactly where a promote-again action lives.
 *
 * All three tables are unioned into one stream first, and ROW_NUMBER()
 * is computed OVER THAT COMBINED STREAM (partitioned by document_id) -
 * not per-table - which is what correctly finds the single latest row
 * across all three tables together rather than three separate "latest
 * per table" answers. A document with no row in any of the three tables
 * simply has no match here at all, which is exactly the Draft case (see
 * modules/draft/draft.repository.js, which LEFT JOINs against this and
 * filters to NULL).
 *
 * Reused, not copy-pasted, by draft/editorial/review/publication/
 * documents repositories - each embeds this same CTE text into its own
 * larger query via a template literal, then adds its own WHERE clause
 * (phase = 'EDITORIAL', document owner = ?, etc).
 */
export const LATEST_PHASE_REQUEST_CTE = `
  WITH all_phase_requests AS (
    SELECT document_id, 'EDITORIAL' AS phase, editorial_request_id AS request_id, status, created_at
    FROM editorial_requests
    UNION ALL
    SELECT document_id, 'REVIEW' AS phase, review_request_id AS request_id, status, created_at
    FROM review_requests
    UNION ALL
    SELECT document_id, 'PUBLICATION' AS phase, publication_request_id AS request_id, status, created_at
    FROM publication_requests
  ),
  latest_phase_request AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC, request_id DESC) AS rn
    FROM all_phase_requests
  )
`;


/**
 * Editorial, Review and Publication all share the exact same
 * request-and-panel-of-approvers shape (editorial_requests /
 * review_requests / publication_requests, each with its own *_approvers
 * table) and the exact same two behaviours: raising a new request, and
 * "whichever assigned approver acts first decides the outcome for
 * everyone else". Rather than re-implement that raw SQL three times with
 * three chances to drift, each phase's repository.js calls these two
 * functions with its own table/column names.
 *
 * Every query here is raw parameterized SQL run through knex's
 * .raw(sql, bindings) - `?` binds a value, `??` binds an identifier
 * (table/column name). Table and column names are only ever supplied by
 * our own module code (never request input), but `??` is used for them
 * anyway rather than string-interpolating them into the SQL, so there's
 * no path from a mistake here to a broken or injectable query.
 *
 * Every exported function takes `client` as its first argument - either
 * the shared db connection (config/db.js) for a single standalone
 * statement, or an active transaction (db.transaction(async trx => ...))
 * when the caller needs this statement to be atomic with others. The
 * caller (always a module's repository.js, orchestrated by that module's
 * service.js) decides which.
 *
 * live_delete_requests is deliberately NOT included here - it needs
 * unanimous approval from a fixed 1-editor+1-reviewer+1-publisher panel
 * with a very different resolution rule (any single REJECTED cancels the
 * whole request; APPROVED only resolves once all three have approved),
 * so it gets its own logic in modules/deletion/deletion.repository.js.
 */

/**
 * Inserts a new PENDING request row plus one PENDING approver row per
 * assignee, inside the given transaction. Always a brand-new row (never
 * an UPDATE of a previous rejected/cancelled request) - see the comment
 * in database/knex/migrations/009_create_editorial_requests.js for why.
 */
export async function raisePhaseRequest(trx, { requestTable, approversTable, requestIdColumn, documentId, createdBy, approverIds }) {
  const insertRequestSql = `
    INSERT INTO ?? (document_id, status, created_by)
    VALUES (?, ?, ?)
    RETURNING *
  `;
  const { rows } = await trx.raw(insertRequestSql, [requestTable, documentId, REQUEST_STATUS.PENDING, createdBy]);
  const request = rows[0];
  const requestId = request[requestIdColumn];

  const insertApproverSql = `
    INSERT INTO ?? (??, approver_id, approver_action, created_by)
    VALUES (?, ?, ?, ?)
  `;
  for (const approverId of approverIds) {
    await trx.raw(insertApproverSql, [approversTable, requestIdColumn, requestId, approverId, APPROVER_ACTION.PENDING, createdBy]);
  }

  return request;
}

/**
 * Resolves a Pending request the moment ANY assigned approver acts. MUST
 * be called with an active transaction (not the bare db connection) -
 * the `FOR UPDATE` row lock below only blocks concurrent callers for the
 * lifetime of a transaction; used outside one it would just read
 * normally and provide no protection at all.
 *
 * Locks the request row first so two near-simultaneous approve/reject
 * calls from two different assigned approvers can't both "win" -
 * whichever transaction's SELECT ... FOR UPDATE lands first blocks the
 * other until it commits, and the second one then sees status != PENDING
 * and fails cleanly with "already resolved" instead of silently
 * overwriting the first decision.
 *
 * Only the acting approver's own row is updated to APPROVED/REJECTED -
 * every other assigned approver's row is deliberately left PENDING. The
 * request's own `status` column is the single source of truth for
 * "resolved or not"; writing a decision on behalf of someone who never
 * actually acted would be false history for no real benefit, since a
 * resolved request already disappears from their Requests For Approval
 * list either way.
 */
export async function resolvePhaseApproverAction(trx, { requestTable, approversTable, requestIdColumn, requestId, actingUserId, action, comments }) {
  const lockSql = `SELECT * FROM ?? WHERE ?? = ? FOR UPDATE`;
  const { rows: requestRows } = await trx.raw(lockSql, [requestTable, requestIdColumn, requestId]);
  const request = requestRows[0];

  if (!request) {
    throw ApiError.notFound('Request not found.');
  }
  if (request.status !== REQUEST_STATUS.PENDING) {
    throw ApiError.conflict('This request was already resolved.', { resolvedStatus: request.status });
  }

  const approverLookupSql = `SELECT * FROM ?? WHERE ?? = ? AND approver_id = ?`;
  const { rows: approverRows } = await trx.raw(approverLookupSql, [approversTable, requestIdColumn, requestId, actingUserId]);

  if (!approverRows[0]) {
    throw ApiError.forbidden('You are not an assigned approver on this request.');
  }

  const updateApproverSql = `
    UPDATE ??
    SET approver_action = ?, comments = ?, updated_by = ?, updated_at = now()
    WHERE ?? = ? AND approver_id = ?
  `;
  await trx.raw(updateApproverSql, [approversTable, action, comments ?? null, actingUserId, requestIdColumn, requestId, actingUserId]);

  const updateRequestSql = `
    UPDATE ??
    SET status = ?, updated_by = ?, updated_at = now()
    WHERE ?? = ?
    RETURNING *
  `;
  const { rows: updatedRows } = await trx.raw(updateRequestSql, [requestTable, action, actingUserId, requestIdColumn, requestId]);

  return updatedRows[0];
}

/**
 * Appends one row to document_stage_history. Called from every service
 * method that changes a document's stage or a request's status, so the
 * Document Detail view's Stage History timeline is always complete
 * without any table having to be reverse-engineered after the fact.
 */
export async function logStageTransition(trx, { documentId, fromStage, toStage, oldStatus, newStatus, actionBy }) {
  const sql = `
    INSERT INTO document_stage_history (document_id, from_stage, to_stage, old_status, new_status, action_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await trx.raw(sql, [documentId, fromStage, toStage, oldStatus ?? null, newStatus, actionBy]);
}
