/**
 * Wraps an async router handler so a rejected promise (a thrown ApiError,
 * a knex error, anything) is forwarded to next() instead of becoming an
 * unhandled rejection - keeps every router file free of repetitive
 * try/catch blocks.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
