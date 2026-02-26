import httpStatus from 'http-status-codes';
import mongoose from 'mongoose';
import razorpay from '../config/razorpay.js';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import ApiError from '../utils/ApiError.js';
import { verifyRazorpaySignature } from '../utils/paymentUtils.js';
import logger from '../utils/logger.js';

export async function createOrder({ bookingId, userId }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  if (String(booking.user) !== String(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot create order for this booking');
  }
  if (booking.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot pay for cancelled booking');
  }
  if (booking.status === 'paid' || booking.status === 'confirmed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking already paid');
  }

  // Check if payment already exists
  let payment = await Payment.findOne({ booking: booking._id });
  if (payment && payment.status === 'paid') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment already completed');
  }

  const amountPaise = Math.round(booking.amount * 100);

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: booking.currency || 'INR',
      receipt: `booking_${booking._id}`,
      notes: {
        bookingId: String(booking._id),
        userId: String(userId)
      }
    });

    if (payment) {
      // Update existing payment record
      payment.razorpayOrderId = order.id;
      payment.status = 'created';
      await payment.save();
    } else {
      // Create new payment record
      payment = await Payment.create({
        booking: booking._id,
        razorpayOrderId: order.id,
        status: 'created',
        amount: booking.amount,
        currency: booking.currency || 'INR'
      });

      booking.payment = payment._id;
      await booking.save();
    }

    logger.info('Razorpay order created', {
      bookingId,
      orderId: order.id,
      amount: booking.amount
    });

    return { order, paymentId: payment._id };
  } catch (error) {
    logger.error('Failed to create Razorpay order', {
      bookingId,
      error: error.message
    });
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create payment order',
      { originalError: error.message }
    );
  }
}

export async function verifyPayment({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ booking: bookingId, razorpayOrderId }).session(session);
    if (!payment) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Payment record not found');
    }

    // Check if already verified
    if (payment.status === 'paid') {
      await session.commitTransaction();
      return payment;
    }

    const valid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!valid) {
      payment.status = 'failed';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      await payment.save({ session });
      await session.commitTransaction();
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid payment signature');
    }

    // Update payment status
    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    await payment.save({ session });

    // Update booking status
    const { markBookingPaid } = await import('./bookingService.js');
    await markBookingPaid(bookingId, payment._id);

    await session.commitTransaction();
    return payment;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function refundPayment({ paymentId, amount, reason }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
    }
    if (payment.status !== 'paid') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only paid payments can be refunded');
    }

    if (!payment.razorpayPaymentId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment ID not found');
    }

    const amountPaise = amount ? Math.round(amount * 100) : undefined;
    const maxRefundAmount = Math.round(payment.amount * 100);

    if (amountPaise && amountPaise > maxRefundAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refund amount exceeds payment amount');
    }

    try {
      const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: amountPaise,
        notes: {
          reason: reason || 'Refund requested',
          refundedAt: new Date().toISOString()
        }
      });

      payment.status = 'refunded';
      payment.refundId = refund.id;
      payment.refundAmount = amount || payment.amount;
      await payment.save({ session });

      const booking = await Booking.findById(payment.booking).session(session);
      if (booking) {
        booking.status = 'cancelled';
        await booking.save({ session });
      }

      await session.commitTransaction();

      logger.info('Payment refunded successfully', {
        paymentId,
        refundId: refund.id,
        amount: amount || payment.amount
      });

      return { payment, refund };
    } catch (razorpayError) {
      logger.error('Razorpay refund failed', {
        paymentId,
        error: razorpayError.message,
        razorpayError
      });
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to process refund',
        { originalError: razorpayError.message }
      );
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

