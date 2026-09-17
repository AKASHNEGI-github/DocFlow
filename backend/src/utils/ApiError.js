/**
 * Thrown from any service method for an expected, named failure (not
 * found, forbidden, conflict, validation, ...). Caught centrally by
 * middleware/errorHandler.js and turned into the same { code, message,
 * data } response shape ApiResponse.ok/created use for success -
 * individual routers/services never format an error response
 * themselves, they just throw one of these (or let zod's own error
 * surface through middleware/validate.js).
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  /** 400 - the request itself is malformed (also what zod validation failures surface as, via validate.js). */
  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  /** 401 - no valid access token was presented. */
  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message);
  }

  /** 403 - authenticated, but not allowed to do this specific thing (wrong role, not the owner, not an assigned approver, ...). */
  static forbidden(message = 'You are not allowed to do this.') {
    return new ApiError(403, message);
  }

  /** 404 - the thing itself doesn't exist (or is soft-deleted, which reads the same to a caller). */
  static notFound(message = 'Not found.') {
    return new ApiError(404, message);
  }

  /** 409 - the request is well-formed but conflicts with the current state (already resolved, duplicate email, already voted, ...). */
  static conflict(message, details) {
    return new ApiError(409, message, details);
  }

  /** 410 - existed once, deliberately gone for good (distinct from 404: the caller had a valid reason to expect it existed). Not currently thrown anywhere in this codebase, kept available for a future hard-delete style endpoint. */
  static gone(message = 'This no longer exists.') {
    return new ApiError(410, message);
  }

  /** 422 - well-formed and individually valid fields, but the combination doesn't make semantic sense (distinct from 400's "this field is wrong" - reach for this when the failure is about how fields relate, not any single one). */
  static unprocessable(message, details) {
    return new ApiError(422, message, details);
  }

  /** 429 - not currently enforced anywhere in this API, kept available for whenever rate limiting is added. */
  static tooManyRequests(message = 'Too many requests. Please slow down.') {
    return new ApiError(429, message);
  }

  /** 500 - anything unexpected; errorHandler.js falls back to this automatically for an error it doesn't otherwise recognize, so this is rarely thrown directly. */
  static internal(message = 'Something went wrong.') {
    return new ApiError(500, message);
  }

  /** 503 - a dependency (most likely the database) is unreachable rather than the request itself being at fault. */
  static serviceUnavailable(message = 'Service temporarily unavailable. Please try again shortly.') {
    return new ApiError(503, message);
  }
}
