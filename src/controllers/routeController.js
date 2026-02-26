import Joi from 'joi';
import asyncHandler from '../utils/asyncHandler.js';
import { searchRoutes } from '../services/routeService.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { successResponse } from '../utils/response.js';
import { VALID_LOCATION_CODES } from '../config/locations.js';

const validCodes = Array.from(VALID_LOCATION_CODES);

const searchSchema = {
  query: Joi.object({
    from: Joi.string().valid(...validCodes).optional().messages({
      'any.only': `'from' must be a valid helipad code (e.g. DEHRA, KEDAR, PHATA)`
    }),
    to: Joi.string().valid(...validCodes).optional().messages({
      'any.only': `'to' must be a valid helipad code (e.g. DEHRA, KEDAR, PHATA)`
    }),
    date: Joi.string().isoDate().optional().messages({
      'string.isoDate': 'Date must be in ISO format (YYYY-MM-DD)'
    }),
    seats: Joi.number().integer().min(1).max(50).optional().messages({
      'number.base': 'Seats must be a number',
      'number.integer': 'Seats must be an integer',
      'number.min': 'At least 1 seat is required',
      'number.max': 'Maximum 50 seats allowed'
    }),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
  })
};

export const validateSearch = validate(searchSchema);

export const search = asyncHandler(async (req, res) => {
  const { from, to, date, seats, page = 1, limit = 20 } = req.query;
  const result = await searchRoutes({
    from,
    to,
    date,
    seats: seats ? Number(seats) : undefined,
    page: Number(page),
    limit: Number(limit)
  });

  return successResponse(res, result, null);
});
