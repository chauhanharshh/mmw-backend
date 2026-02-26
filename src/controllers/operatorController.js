import Joi from 'joi';
import asyncHandler from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  operatorCreateOrUpdateRoute,
  getOperatorBookingsForUser,
  getOperatorRoutesForUser,
  getOperatorAnalyticsForUser
} from '../services/operatorService.js';
import { successResponse } from '../utils/response.js';
import { VALID_LOCATION_CODES } from '../config/locations.js';

const validCodes = Array.from(VALID_LOCATION_CODES);

const routeSchema = {
  body: Joi.object({
    routeId: Joi.string().optional().messages({
      'string.empty': 'Route ID cannot be empty'
    }),
    from: Joi.string().valid(...validCodes).required().messages({
      'any.required': 'From location is required',
      'any.only': `'from' must be a valid helipad code (e.g. DEHRA, KEDAR, PHATA)`
    }),
    to: Joi.string().valid(...validCodes).required().messages({
      'any.required': 'To location is required',
      'any.only': `'to' must be a valid helipad code (e.g. DEHRA, KEDAR, PHATA)`
    }),
    departureTime: Joi.date().iso().required().messages({
      'any.required': 'Departure time is required',
      'date.base': 'Departure time must be a valid date',
      'date.format': 'Departure time must be in ISO format'
    }),
    arrivalTime: Joi.date().iso().required().messages({
      'any.required': 'Arrival time is required',
      'date.base': 'Arrival time must be a valid date',
      'date.format': 'Arrival time must be in ISO format'
    }),
    basePrice: Joi.number().positive().required().messages({
      'any.required': 'Base price is required',
      'number.base': 'Base price must be a number',
      'number.positive': 'Base price must be positive'
    }),
    currency: Joi.string().length(3).uppercase().default('INR').messages({
      'string.length': 'Currency must be 3 characters (e.g., INR, USD)'
    }),
    totalSeats: Joi.number().integer().min(1).max(100).required().messages({
      'any.required': 'Total seats is required',
      'number.base': 'Total seats must be a number',
      'number.integer': 'Total seats must be an integer',
      'number.min': 'At least 1 seat is required',
      'number.max': 'Maximum 100 seats allowed'
    }),
    status: Joi.string().valid('active', 'inactive').optional().messages({
      'any.only': 'Status must be either active or inactive'
    })
  }).custom((value, helpers) => {
    if (value.from && value.to && value.from === value.to) {
      return helpers.error('any.custom', { message: 'From and To locations must be different' });
    }
    if (value.arrivalTime && value.departureTime) {
      if (new Date(value.arrivalTime) <= new Date(value.departureTime)) {
        return helpers.error('any.custom', { message: 'Arrival time must be after departure time' });
      }
    }
    return value;
  })
};

export const validateOperatorRoute = validate(routeSchema);

// ── Existing: upsert route (unchanged behaviour) ───────────────────────────
export const upsertRoute = asyncHandler(async (req, res) => {
  const { routeId, ...payload } = req.body;
  const route = await operatorCreateOrUpdateRoute({ user: req.user, routeId, payload });
  await route.populate('operator', 'companyName');
  const message = routeId ? 'Route updated successfully' : 'Route created successfully';
  return successResponse(res, { route }, message, routeId ? 200 : 201);
});

// ── Enhanced: now populates payment + full user info ───────────────────────
export const listOperatorBookings = asyncHandler(async (req, res) => {
  const bookings = await getOperatorBookingsForUser(req.user);
  return successResponse(res, { bookings }, null);
});

// ── New: list operator's own routes ───────────────────────────────────────
export const getOperatorRoutes = asyncHandler(async (req, res) => {
  const routes = await getOperatorRoutesForUser(req.user);
  return successResponse(res, { routes }, null);
});

// ── New: operator analytics ────────────────────────────────────────────────
export const getOperatorAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getOperatorAnalyticsForUser(req.user);
  return successResponse(res, { analytics }, null);
});
