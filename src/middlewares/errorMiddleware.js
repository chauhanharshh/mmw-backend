import httpStatus from 'http-status-codes';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status =
    err instanceof ApiError && err.statusCode
      ? err.statusCode
      : httpStatus.INTERNAL_SERVER_ERROR;

  const requestId = req.id || 'unknown';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Standardized error response
  const response = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      statusCode: status,
      requestId
    }
  };

  // Add details if available
  if (err.details) {
    response.error.details = err.details;
  }

  // Add validation errors if Joi validation failed
  if (err.isJoi) {
    response.error.details = err.details?.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
  }

  // Add stack trace in development
  if (isDevelopment && err.stack) {
    response.error.stack = err.stack;
  }

  // Log error with context
  logger.error('Request error', {
    requestId,
    status,
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
    userId: req.user?._id,
    ip: req.ip
  });

  res.status(status).json(response);
}

export function notFound(req, res, next) {
  next(new ApiError(httpStatus.NOT_FOUND, 'Route not found'));
}

