/**
 * Every response this API ever sends - success or error - has the exact
 * same shape: { code, message, data }. `code` is the HTTP status code
 * (200/201 for success, 4xx/5xx for errors), so the frontend can key off
 * a single field instead of a separate boolean flag, and `data` is
 * always present (null when there's nothing to return) rather than
 * sometimes missing from the payload entirely.
 *
 * Router files never build this shape by hand - they call ApiResponse.ok
 * / ApiResponse.created, and middleware/errorHandler.js is the only
 * other caller, via ApiResponse.error.
 */
export class ApiResponse {
  static send(res, code, data, message) {
    return res.status(code).json({ code, message, data: data ?? null });
  }

  static ok(res, data, message = 'Success', code = 200) {
    return ApiResponse.send(res, code, data, message);
  }

  static created(res, data, message = 'Created') {
    return ApiResponse.ok(res, data, message, 201);
  }

  static error(res, code, message, data = null) {
    return ApiResponse.send(res, code, data, message);
  }
}
