import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';
import {
  createOrderController,
  verifyPaymentController,
  refundController,
  webhookController,
  validateOrder,
  validateVerify,
  validateRefund
} from '../controllers/paymentController.js';
import { paymentLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/order', authenticate, paymentLimiter, validateOrder, createOrderController);
router.post('/verify', authenticate, paymentLimiter, validateVerify, verifyPaymentController);
router.post(
  '/refund',
  authenticate,
  authorizeRoles('admin', 'operator'),
  paymentLimiter,
  validateRefund,
  refundController
);

// Webhook route will use raw body, mounted separately in app.js
router.post('/webhook', webhookController);

export default router;

