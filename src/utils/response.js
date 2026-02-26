/**
 * Standardized API response utility
 * Ensures consistent response format across all endpoints
 */

/**
 * Success response wrapper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function successResponse(res, data, message = null, statusCode = 200) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Error response wrapper (for non-thrown errors)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {*} details - Optional error details
 */
export function errorResponse(res, message, statusCode = 400, details = null) {
  const response = {
    success: false,
    error: {
      message,
      statusCode
    }
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Paginated response wrapper
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 */
export function paginatedResponse(res, data, pagination) {
  return res.json({
    success: true,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || data.length,
      pages: Math.ceil((pagination.total || data.length) / (pagination.limit || 10))
    }
  });
}
