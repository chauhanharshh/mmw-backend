import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },
    provider: {
      type: String,
      default: 'razorpay'
    },
    razorpayOrderId: {
      type: String,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      index: true
    },
    razorpaySignature: {
      type: String
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    refundId: {
      type: String
    },
    refundAmount: {
      type: Number
    },
    rawWebhookEvent: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

