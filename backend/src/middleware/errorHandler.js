import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Postgres error codes worth translating into a friendlier response
// than a bare 500. Full list: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

function fromPgError(err) {
  if (err.code === PG_UNIQUE_VIOLATION) {
    return ApiError.conflict('That value is already in use.', { constraint: err.constraint });
  }
  if (err.code === PG_FOREIGN_KEY_VIOLATION) {
    return ApiError.badRequest('This action references something that no longer exists.', {
      constraint: err.constraint,
    });
  }
  if (err.code === PG_CHECK_VIOLATION) {
    return ApiError.badRequest('That value is not allowed.', { constraint: err.constraint });
  }
  return null;
}

/**
 * Registered last in app.js. Every route either throws/next()s an
 * ApiError directly, or lets a knex/pg error bubble up to be translated
 * here - routers and services never format an error response by hand.
 * The response this sends is the same { code, message, data } shape
 * ApiResponse.ok/created use for success - `data` carries whatever
 * ApiError.details held (validation issues, the offending constraint
 * name, ...), or null when there's nothing more specific to report.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let apiError = err instanceof ApiError ? err : fromPgError(err);

  if (!apiError) {
    console.error('Unhandled error:', err);
    apiError = ApiError.internal();
  }

  return ApiResponse.error(res, apiError.statusCode, apiError.message, apiError.details ?? null);
}
