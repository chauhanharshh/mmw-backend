import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Route from '../models/Route.js';
import Operator from '../models/Operator.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status-codes';

export async function createBooking({ user, routeId, seats }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const route = await Route.findById(routeId).session(session);
    if (!route || route.status !== 'active') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Route not found or inactive');
    }

    const operator = await Operator.findById(route.operator).session(session);
    if (!operator) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Operator not found for this route');
    }
    // Accept both 'active' (current) and 'approved' (legacy) statuses
    if (operator.status !== 'active' && operator.status !== 'approved') {
      const msg =
        operator.status === 'pending' ? 'This route\'s operator is pending admin approval' :
          operator.status === 'suspended' ? 'This route\'s operator account is suspended' :
            operator.status === 'rejected' ? 'This route\'s operator application was rejected' :
              'Operator not available for booking';
      throw new ApiError(httpStatus.BAD_REQUEST, msg);
    }

    const now = new Date();
    const lockExpiry = new Date(now.getTime() + config.booking.seatLockMinutes * 60 * 1000);

    const aggregation = await Booking.aggregate([
      {
        $match: {
          route: route._id,
          status: { $in: ['pending', 'paid', 'confirmed'] },
          $or: [
            { seatLockExpiresAt: null },
            { seatLockExpiresAt: { $gt: now } }
          ]
        }
      },
      {
        $group: {
          _id: '$route',
          seatsBooked: { $sum: '$seats' }
        }
      }
    ]).session(session);

    const usedSeats = aggregation[0]?.seatsBooked || 0;
    const remaining = route.totalSeats - usedSeats;

    if (remaining < seats) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough seats available');
    }

    const amount = route.basePrice * seats;

    const booking = await Booking.create(
      [
        {
          user: user._id,
          operator: operator._id,
          route: route._id,
          seats,
          status: 'pending',
          amount,
          currency: route.currency,
          seatLockExpiresAt: lockExpiry
        }
      ],
      { session }
    );

    await session.commitTransaction();
    return booking[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function cancelBooking({ user, bookingId }) {
  const booking = await Booking.findById(bookingId).populate('route');
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  const canCancel =
    String(booking.user) === String(user._id) ||
    user.role === 'admin' ||
    user.role === 'operator';

  if (!canCancel) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot cancel this booking');
  }

  if (booking.status === 'cancelled') {
    return booking;
  }

  booking.status = 'cancelled';
  booking.seatLockExpiresAt = new Date();
  await booking.save();
  return booking;
}

export async function getUserBookings(userId) {
  return Booking.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('route')
    .lean();
}

export async function getOperatorBookings(operatorId) {
  return Booking.find({ operator: operatorId })
    .sort({ createdAt: -1 })
    .populate('route user')
    .lean();
}

export async function markBookingPaid(bookingId, paymentId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot pay for cancelled booking');
  }

  booking.status = 'paid';
  booking.payment = paymentId;
  booking.seatLockExpiresAt = null;
  await booking.save();
  return booking;
}

