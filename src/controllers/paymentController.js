import Joi from 'joi';
import asyncHandler from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validateMiddleware.js';
import {
  createOrder,
  verifyPayment,
  refundPayment
} from '../services/paymentService.js';
import { verifyRazorpayWebhookSignature } from '../utils/paymentUtils.js';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import logger from '../utils/logger.js';

const orderSchema = {
  body: Joi.object({
    bookingId: Joi.string().required()
  })
};

const verifySchema = {
  body: Joi.object({
    bookingId: Joi.string().required(),
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required()
  })
};

const refundSchema = {
  body: Joi.object({
    paymentId: Joi.string().required(),
    amount: Joi.number().positive().optional(),
    reason: Joi.string().max(500).optional()
  })
};

export const validateOrder = validate(orderSchema);
export const validateVerify = validate(verifySchema);
export const validateRefund = validate(refundSchema);

export const createOrderController = asyncHandler(async (req, res) => {
  const result = await createOrder({
    bookingId: req.body.bookingId,
    userId: req.user._id
  });
  res.status(201).json({
    success: true,
    data: result,
    message: 'Payment order created successfully'
  });
});

export const verifyPaymentController = asyncHandler(async (req, res) => {
  const payment = await verifyPayment({
    bookingId: req.body.bookingId,
    razorpayOrderId: req.body.razorpay_order_id,
    razorpayPaymentId: req.body.razorpay_payment_id,
    razorpaySignature: req.body.razorpay_signature
  });

  // Populate booking details for response
  await payment.populate('booking');
  
  res.json({
    success: true,
    data: {
      payment,
      message: 'Payment verified successfully'
    }
  });
});

export const refundController = asyncHandler(async (req, res) => {
  const result = await refundPayment({
    paymentId: req.body.paymentId,
    amount: req.body.amount,
    reason: req.body.reason
  });
  res.json({
    success: true,
    data: result,
    message: 'Refund processed successfully'
  });
});

export const webhookController = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return res.status(400).json({
      success: false,
      error: { message: 'Missing signature header' }
    });
  }

  const valid = verifyRazorpayWebhookSignature(req.body, signature);

  if (!valid) {
    logger.warn('Invalid Razorpay webhook signature', {
      signature: signature.substring(0, 20) + '...'
    });
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid signature' }
    });
  }

  const event = JSON.parse(req.body.toString('utf8'));
  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;

  logger.info('Razorpay webhook received', {
    eventType,
    paymentId: paymentEntity?.id
  });

  // Handle payment success
  if (eventType === 'payment.captured' && paymentEntity) {
    const bookingId = paymentEntity.notes?.bookingId;
    
    if (bookingId) {
      const payment = await Payment.findOne({
        booking: bookingId,
        razorpayPaymentId: paymentEntity.id
      });

      if (payment) {
        // Store webhook event for audit
        payment.rawWebhookEvent = event;
        
        // Update payment status if not already paid
        if (payment.status !== 'paid') {
          payment.status = 'paid';
          payment.razorpayPaymentId = paymentEntity.id;
          payment.razorpaySignature = signature;
          
          // Update booking status
          const { markBookingPaid } = await import('../services/bookingService.js');
          await markBookingPaid(bookingId, payment._id);
        }
        
        await payment.save();
        
        logger.info('Payment updated via webhook', {
          bookingId,
          paymentId: payment._id
        });
      }
    }
  }

  // Handle refund events
  if (eventType === 'refund.created' || eventType === 'refund.processed') {
    const refundEntity = event.payload?.refund?.entity;
    if (refundEntity && refundEntity.payment_id) {
      const payment = await Payment.findOne({
        razorpayPaymentId: refundEntity.payment_id
      });
      
      if (payment && payment.status !== 'refunded') {
        payment.status = 'refunded';
        payment.refundId = refundEntity.id;
        payment.rawWebhookEvent = event;
        await payment.save();
        
        // Cancel associated booking
        const booking = await Booking.findById(payment.booking);
        if (booking && booking.status !== 'cancelled') {
          booking.status = 'cancelled';
          await booking.save();
        }
        
        logger.info('Refund processed via webhook', {
          paymentId: payment._id,
          refundId: refundEntity.id
        });
      }
    }
  }

  res.status(200).json({ success: true, message: 'Webhook processed' });
});

