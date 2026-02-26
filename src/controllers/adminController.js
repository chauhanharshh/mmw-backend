import Joi from 'joi';
import asyncHandler from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { successResponse } from '../utils/response.js';
import * as adminService from '../services/adminService.js';
import logger from '../utils/logger.js';


// ─── Validation Schemas ─────────────────────────────────────────────────────

const createOperatorSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().optional(),
    phone: Joi.string().optional(),
    companyName: Joi.string().required(),
    licenseNumber: Joi.string().required(),
    contactPerson: Joi.string().optional(),
    commissionRate: Joi.number().min(0).max(100).default(10)
  })
};

const approveSchema = {
  body: Joi.object({
    commissionRate: Joi.number().min(0).max(100).default(10)
  })
};

const rejectSchema = {
  body: Joi.object({
    reason: Joi.string().min(5).max(500).required().messages({
      'any.required': 'Rejection reason is required',
      'string.min': 'Reason must be at least 5 characters'
    })
  })
};

const suspendSchema = {
  body: Joi.object({
    reason: Joi.string().min(5).max(500).required().messages({
      'any.required': 'Suspension reason is required'
    })
  })
};

const commissionSchema = {
  body: Joi.object({
    commissionRate: Joi.number().min(0).max(100).required()
  })
};

const updateOperatorSchema = {
  body: Joi.object({
    companyName: Joi.string().optional(),
    contactPerson: Joi.string().optional(),
    phone: Joi.string().optional(),
    documents: Joi.array().items(Joi.string()).optional()
  })
};

// ─── Exported Validators ────────────────────────────────────────────────────
export const validateCreateOperator = validate(createOperatorSchema);
export const validateApprove = validate(approveSchema);
export const validateReject = validate(rejectSchema);
export const validateSuspend = validate(suspendSchema);
export const validateCommission = validate(commissionSchema);
export const validateUpdateOperator = validate(updateOperatorSchema);

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/admin/login-verify
 * Verifies the authenticated user is an active admin.
 * Requires: Firebase token (via authenticate middleware) + role === 'admin'.
 */
export const loginVerifyController = asyncHandler(async (req, res) => {
  const { user } = req;

  // Belt-and-suspenders check (authorizeRoles already ran, but be explicit)
  if (!user || user.role !== 'admin') {
    logger.warn('[AdminLogin] Unauthorized verify attempt', {
      uid: user?.firebaseUid,
      email: user?.email,
      role: user?.role,
      ip: req.ip
    });
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access denied.' }
    });
  }

  if (user.status !== 'active') {
    logger.warn('[AdminLogin] Inactive admin login attempt', {
      uid: user.firebaseUid,
      email: user.email,
      status: user.status,
      ip: req.ip
    });
    return res.status(403).json({
      success: false,
      error: { message: 'Admin account is not active.' }
    });
  }

  logger.info('[AdminLogin] Admin verified successfully', {
    uid: user.firebaseUid,
    email: user.email,
    ip: req.ip
  });

  return successResponse(res, { verified: true, role: 'admin', email: user.email }, 'Admin verified');
});

/** GET /api/admin/operators */
export const listOperatorsController = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const result = await adminService.listOperators({
    status,
    search,
    page: Number(page),
    limit: Number(limit)
  });
  return successResponse(res, result, null);
});

/** GET /api/admin/operators/:id */
export const getOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.getOperatorById(req.params.id);
  if (!operator) return successResponse(res, null, 'Operator not found', 404);
  return successResponse(res, { operator }, null);
});

/** POST /api/admin/operators */
export const createOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.adminCreateOperator({
    payload: req.body,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Operator created successfully', 201);
});

/** PATCH /api/admin/operators/:id/approve */
export const approveOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.approveOperator({
    operatorId: req.params.id,
    commissionRate: req.body.commissionRate ?? 10,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Operator approved successfully');
});

/** PATCH /api/admin/operators/:id/reject */
export const rejectOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.rejectOperator({
    operatorId: req.params.id,
    reason: req.body.reason,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Operator rejected');
});

/** PATCH /api/admin/operators/:id/suspend */
export const suspendOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.suspendOperator({
    operatorId: req.params.id,
    reason: req.body.reason,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Operator suspended');
});

/** PATCH /api/admin/operators/:id/unsuspend */
export const unsuspendOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.unsuspendOperator({
    operatorId: req.params.id,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Operator reactivated');
});

/** PATCH /api/admin/operators/:id/block */
export const blockOperatorController = asyncHandler(async (req, res) => {
  // Uses suspend logic which already enforces User.status
  const operator = await adminService.suspendOperator({
    operatorId: req.params.id,
    reason: 'Account blocked by cleanup/policy enforcement.',
    adminUser: req.user,
    req,
  });
  return successResponse(res, { operator }, 'Operator blocked successfully');
});

/** PATCH /api/admin/operators/:id/unblock */
export const unblockOperatorController = asyncHandler(async (req, res) => {
  // Uses unsuspend logic which already enforces User.status
  const operator = await adminService.unsuspendOperator({
    operatorId: req.params.id,
    adminUser: req.user,
    req,
  });
  return successResponse(res, { operator }, 'Operator unblocked successfully');
});

/** PATCH /api/admin/operators/:id/commission */
export const updateCommissionController = asyncHandler(async (req, res) => {
  const operator = await adminService.updateCommission({
    operatorId: req.params.id,
    commissionRate: req.body.commissionRate,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Commission rate updated');
});

/** PUT /api/admin/operators/:id */
export const updateOperatorController = asyncHandler(async (req, res) => {
  const operator = await adminService.updateOperator({
    operatorId: req.params.id,
    payload: req.body,
    adminUser: req.user,
    req
  });
  return successResponse(res, { operator }, 'Operator updated');
});

/** DELETE /api/admin/operators/:id */
export const deleteOperatorController = asyncHandler(async (req, res) => {
  await adminService.deleteOperator({
    operatorId: req.params.id,
    adminUser: req.user,
    req
  });
  return successResponse(res, null, 'Operator deleted');
});

/** POST /api/admin/operators/:id/password-reset */
export const passwordResetController = asyncHandler(async (req, res) => {
  const result = await adminService.triggerPasswordReset({
    operatorId: req.params.id,
    adminUser: req.user,
    req
  });
  return successResponse(res, result, 'Password reset link generated');
});

/** GET /api/admin/revenue */
export const getRevenueController = asyncHandler(async (req, res) => {
  const revenue = await adminService.getRevenue();
  return successResponse(res, { revenue }, null);
});

/** GET /api/admin/audit-logs */
export const getAuditLogsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, adminId, action } = req.query;
  const result = await adminService.getAuditLogs({
    page: Number(page),
    limit: Number(limit),
    adminId,
    action
  });
  return successResponse(res, result, null);
});

/** GET /api/admin/payments */
export const getPaymentsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search, from, to, operatorId } = req.query;
  const result = await adminService.getPayments({
    page: Number(page),
    limit: Number(limit),
    status,
    search,
    from,
    to,
    operatorId
  });
  return successResponse(res, result, null);
});

/** GET /api/admin/analytics */
export const getPlatformAnalyticsController = asyncHandler(async (req, res) => {
  const analytics = await adminService.getPlatformAnalytics();
  return successResponse(res, { analytics }, null);
});

/** GET /api/admin/operators/:id/details */
export const getOperatorDetailsController = asyncHandler(async (req, res) => {
  const details = await adminService.getOperatorDetails(req.params.id);
  if (!details) return res.status(404).json({ success: false, error: { message: 'Operator not found' } });
  return successResponse(res, details, null);
});


