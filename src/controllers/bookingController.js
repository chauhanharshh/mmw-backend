import Joi from 'joi';
import asyncHandler from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  createBooking,
  cancelBooking,
  getUserBookings
} from '../services/bookingService.js';
import { successResponse } from '../utils/response.js';

const createSchema = {
  body: Joi.object({
    routeId: Joi.string().required().messages({
      'any.required': 'Route ID is required',
      'string.empty': 'Route ID cannot be empty'
    }),
    seats: Joi.number().integer().min(1).max(50).required().messages({
      'any.required': 'Number of seats is required',
      'number.base': 'Seats must be a number',
      'number.integer': 'Seats must be an integer',
      'number.min': 'At least 1 seat is required',
      'number.max': 'Maximum 50 seats allowed'
    })
  })
};

const cancelSchema = {
  body: Joi.object({
    bookingId: Joi.string().required().messages({
      'any.required': 'Booking ID is required',
      'string.empty': 'Booking ID cannot be empty'
    })
  })
};

export const validateCreate = validate(createSchema);
export const validateCancel = validate(cancelSchema);

export const create = asyncHandler(async (req, res) => {
  const booking = await createBooking({
    user: req.user,
    routeId: req.body.routeId,
    seats: req.body.seats
  });
  
  // Populate route details for response
  await booking.populate('route');
  
  return successResponse(
    res,
    { booking },
    'Booking created successfully. Please complete payment within 10 minutes.',
    201
  );
});

export const cancel = asyncHandler(async (req, res) => {
  const booking = await cancelBooking({
    user: req.user,
    bookingId: req.body.bookingId
  });
  
  await booking.populate('route');
  
  return successResponse(res, { booking }, 'Booking cancelled successfully');
});

export const listUserBookings = asyncHandler(async (req, res) => {
  const bookings = await getUserBookings(req.user._id);
  return successResponse(res, { bookings }, null);
});

