import { Router } from 'express';
import { authenticate, requireActiveOperator } from '../middlewares/authMiddleware.js';
import {
  upsertRoute,
  listOperatorBookings,
  validateOperatorRoute,
  getOperatorRoutes,
  getOperatorAnalytics
} from '../controllers/operatorController.js';

const router = Router();

// All operator routes require a verified, active operator account
router.post(
  '/route',
  authenticate,
  requireActiveOperator,
  validateOperatorRoute,
  upsertRoute
);

router.get(
  '/bookings',
  authenticate,
  requireActiveOperator,
  listOperatorBookings
);

// ─── New endpoints ────────────────────────────────────────────────────────
router.get('/routes', authenticate, requireActiveOperator, getOperatorRoutes);
router.get('/analytics', authenticate, requireActiveOperator, getOperatorAnalytics);

export default router;

