import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

/**
 * Each module's schema.js exports zod schemas grouped by request part,
 * e.g. { body: z.object({...}) } or { body, params }. This middleware
 * parses whichever parts are present and *replaces* req.body/params/query
 * with the parsed (and therefore coerced/defaulted) result, so downstream
 * service methods can trust the shape without re-checking it.
 *
 * Usage: router.post('/new', authenticate, validate(documentsSchema.create), handler)
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.params) req.params = schema.params.parse(req.params);
      if (schema.query) req.query = schema.query.parse(req.query);
      if (schema.body) req.body = schema.body.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return next(ApiError.badRequest('Validation failed.', details));
      }
      return next(err);
    }
  };
}
