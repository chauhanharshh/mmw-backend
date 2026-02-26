import crypto from 'crypto';
import config from '../config/index.js';

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(payload)
    .digest('hex');
  return expected === signature;
}

export function verifyRazorpayWebhookSignature(bodyBuffer, signature) {
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(bodyBuffer)
    .digest('hex');
  return expected === signature;
}

