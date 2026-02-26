import httpStatus from 'http-status-codes';
import admin from '../config/firebase.js';
import User from '../models/User.js';
import Operator from '../models/Operator.js';
import ApiError from '../utils/ApiError.js';

/**
 * Verifies the Firebase JWT and loads the full MongoDB user into req.user.
 * Also loads the operator profile (if role === 'operator') into req.operator.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing'));
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      // Auto-create regular user record on first login
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0],
        role: 'user',
        status: 'active',
        verified: false
      });
    }

    // Block suspended accounts at the gate
    if (user.status === 'suspended') {
      return next(
        new ApiError(httpStatus.FORBIDDEN, 'Your account has been suspended. Please contact support.')
      );
    }

    req.user = user;
    req.firebase = decoded;

    // Preload operator profile for operator role
    if (user.role === 'operator') {
      req.operator = await Operator.findOne({ user: user._id });
    }

    next();
  } catch (err) {
    next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
  }
}

/**
 * Role-based access control.
 * Usage: authorizeRoles('admin') or authorizeRoles('operator', 'admin')
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }
    next();
  };
}

/**
 * Operator-specific middleware: must be role=operator AND status=active.
 * This is stricter than authorizeRoles('operator') — it also checks approval.
 */
export function requireActiveOperator(req, res, next) {
  if (!req.user || req.user.role !== 'operator') {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Operator access required'));
  }

  const operatorStatus = req.operator?.status;

  if (!req.operator || operatorStatus === 'pending') {
    return next(
      new ApiError(
        httpStatus.FORBIDDEN,
        'Your operator account is pending admin approval. You will be notified once approved.'
      )
    );
  }

  if (operatorStatus === 'suspended') {
    return next(
      new ApiError(
        httpStatus.FORBIDDEN,
        'Your operator account has been suspended. Please contact support.'
      )
    );
  }

  if (operatorStatus === 'rejected') {
    return next(
      new ApiError(
        httpStatus.FORBIDDEN,
        'Your operator application was rejected. Please contact support for more information.'
      )
    );
  }

  if (operatorStatus !== 'active') {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Operator account is not active'));
  }

  next();
}
