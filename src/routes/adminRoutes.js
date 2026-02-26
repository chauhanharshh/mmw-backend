import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';
import { adminLoginLimiter } from '../middlewares/rateLimiter.js';
import {
  loginVerifyController,
  listOperatorsController,
  getOperatorController,
  createOperatorController,
  approveOperatorController,
  rejectOperatorController,
  suspendOperatorController,
  unsuspendOperatorController,
  blockOperatorController,
  unblockOperatorController,
  updateCommissionController,
  updateOperatorController,
  deleteOperatorController,
  passwordResetController,
  getRevenueController,
  getAuditLogsController,
  validateCreateOperator,
  validateApprove,
  validateReject,
  validateSuspend,
  validateCommission,
  validateUpdateOperator,
  getPaymentsController,
  getPlatformAnalyticsController,
  getOperatorDetailsController,
} from '../controllers/adminController.js';

import {
  getAdminConfigController,
  updateConfigController,
  getSnapshotsController,
  restoreSnapshotController,
} from '../controllers/configController.js';

const router = Router();

// ── Admin login-verify (strict rate-limited, but same auth stack) ──────────────────
router.post('/login-verify', adminLoginLimiter, authenticate, authorizeRoles('admin'), loginVerifyController);

// All other admin routes require authentication + admin role
router.use(authenticate, authorizeRoles('admin'));

// ─── Revenue ───────────────────────────────────────────────────────────────
router.get('/revenue', getRevenueController);

// ─── Audit Logs ───────────────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogsController);

// ─── Operator CRUD ────────────────────────────────────────────────────────
router.get('/operators', listOperatorsController);
router.get('/operators/:id', getOperatorController);
router.post('/operators', validateCreateOperator, createOperatorController);
router.put('/operators/:id', validateUpdateOperator, updateOperatorController);
router.delete('/operators/:id', deleteOperatorController);

// ─── Operator Status Actions ──────────────────────────────────────────────
router.patch('/operators/:id/approve', validateApprove, approveOperatorController);
router.patch('/operators/:id/reject', validateReject, rejectOperatorController);
router.patch('/operators/:id/suspend', validateSuspend, suspendOperatorController);
router.patch('/operators/:id/unsuspend', unsuspendOperatorController);
router.patch('/operators/:id/block', blockOperatorController);
router.patch('/operators/:id/unblock', unblockOperatorController);

// ─── Commission & Password ────────────────────────────────────────────────
router.patch('/operators/:id/commission', validateCommission, updateCommissionController);
router.post('/operators/:id/password-reset', passwordResetController);

// ─── Payment Ledger ──────────────────────────────────────────────────────
router.get('/payments', getPaymentsController);

// ─── Platform Analytics ──────────────────────────────────────────────────
router.get('/analytics', getPlatformAnalyticsController);

// ─── Rich Operator Details ───────────────────────────────────────────────
router.get('/operators/:id/details', getOperatorDetailsController);

// ─── Platform Config (Website Manager) ───────────────────────────────────
router.get('/config', getAdminConfigController);
router.put('/config', updateConfigController);
router.get('/config/snapshots', getSnapshotsController);
router.post('/config/restore/:snapshotId', restoreSnapshotController);

export default router;
