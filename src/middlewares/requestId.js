import { randomUUID } from 'crypto';

/**
 * Middleware to add unique request ID to each request
 * Helps with tracing and debugging in production
 */
export function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}
