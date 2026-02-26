import admin from '../config/firebase.js';
import Operator from '../models/Operator.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Payment from '../models/Payment.js';
import { logAudit } from './auditService.js';

/**
 * List all operators with optional filtering and search.
 */
export async function listOperators({ status, search, page = 1, limit = 20 }) {
  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  let operators = await Operator.find(query)
    .populate('user', 'name email phone status verified createdAt')
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Search by company name, contact person, or email
  if (search) {
    const q = search.toLowerCase();
    operators = operators.filter(
      (op) =>
        op.companyName?.toLowerCase().includes(q) ||
        op.contactPerson?.toLowerCase().includes(q) ||
        op.user?.email?.toLowerCase().includes(q) ||
        op.licenseNumber?.toLowerCase().includes(q)
    );
  }

  const total = operators.length;
  const skip = (page - 1) * limit;
  const paginated = operators.slice(skip, skip + limit);

  return {
    operators: paginated,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  };
}

/**
 * Get a single operator by ID.
 */
export async function getOperatorById(id) {
  return Operator.findById(id)
    .populate('user', 'name email phone status verified createdAt')
    .populate('approvedBy', 'name email');
}

/**
 * Admin manually creates an operator.
 */
export async function adminCreateOperator({ payload, adminUser, req }) {
  const { email, password, name, phone, companyName, licenseNumber, contactPerson, commissionRate = 10 } = payload;

  // Create Firebase user
  const firebaseUser = await admin.auth().createUser({
    email,
    password,
    displayName: name || companyName,
    emailVerified: false
  });

  // Create User record
  const user = await User.create({
    firebaseUid: firebaseUser.uid,
    email,
    name: name || companyName,
    phone,
    role: 'operator',
    status: 'active',
    verified: false
  });

  // Create Operator record (pre-approved since admin is creating)
  const operator = await Operator.create({
    user: user._id,
    companyName,
    licenseNumber,
    contactPerson,
    phone,
    status: 'active',
    commissionRate,
    approvedAt: new Date(),
    approvedBy: adminUser._id
  });

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.create',
    metadata: { companyName, email, commissionRate },
    req
  });

  return operator;
}

/**
 * Approve a pending operator.
 */
export async function approveOperator({ operatorId, commissionRate = 10, adminUser, req }) {
  const operator = await Operator.findById(operatorId);
  if (!operator) throw new Error('Operator not found');

  const prevStatus = operator.status;

  operator.status = 'active';
  operator.commissionRate = commissionRate;
  operator.approvedAt = new Date();
  operator.approvedBy = adminUser._id;
  operator.rejectionReason = undefined;
  await operator.save();

  // Sync User record: mark as active + verified + approved
  await User.findByIdAndUpdate(operator.user, {
    isOperatorApproved: true,
    status: 'active',
    verified: true
  });

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.approve',
    metadata: { prevStatus, commissionRate },
    req
  });

  return operator;
}

/**
 * Reject a pending operator.
 */
export async function rejectOperator({ operatorId, reason, adminUser, req }) {
  const operator = await Operator.findById(operatorId);
  if (!operator) throw new Error('Operator not found');

  const prevStatus = operator.status;
  operator.status = 'rejected';
  operator.rejectionReason = reason;
  await operator.save();

  await User.findByIdAndUpdate(operator.user, { isOperatorApproved: false });

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.reject',
    metadata: { prevStatus, reason },
    req
  });

  return operator;
}

/**
 * Suspend an active operator.
 */
export async function suspendOperator({ operatorId, reason, adminUser, req }) {
  const operator = await Operator.findById(operatorId);
  if (!operator) throw new Error('Operator not found');

  const prevStatus = operator.status;
  operator.status = 'suspended';
  operator.suspensionReason = reason;
  await operator.save();

  // Also suspend the user account
  await User.findByIdAndUpdate(operator.user, { status: 'suspended', isOperatorApproved: false });

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.suspend',
    metadata: { prevStatus, reason },
    req
  });

  return operator;
}

/**
 * Un-suspend (reactivate) an operator.
 */
export async function unsuspendOperator({ operatorId, adminUser, req }) {
  const operator = await Operator.findById(operatorId);
  if (!operator) throw new Error('Operator not found');

  operator.status = 'active';
  operator.suspensionReason = undefined;
  await operator.save();

  await User.findByIdAndUpdate(operator.user, { status: 'active', isOperatorApproved: true });

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.unsuspend',
    metadata: {},
    req
  });

  return operator;
}

/**
 * Update operator commission rate.
 */
export async function updateCommission({ operatorId, commissionRate, adminUser, req }) {
  const operator = await Operator.findById(operatorId);
  if (!operator) throw new Error('Operator not found');

  const prevRate = operator.commissionRate;
  operator.commissionRate = commissionRate;
  await operator.save();

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.commission_change',
    metadata: { prevRate, newRate: commissionRate },
    req
  });

  return operator;
}

/**
 * Update operator general details.
 */
export async function updateOperator({ operatorId, payload, adminUser, req }) {
  const operator = await Operator.findByIdAndUpdate(operatorId, { $set: payload }, { new: true });
  if (!operator) throw new Error('Operator not found');

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.update',
    metadata: payload,
    req
  });

  return operator;
}

/**
 * Delete an operator (and their User record and Firebase Auth user).
 */
export async function deleteOperator({ operatorId, adminUser, req }) {
  const operator = await Operator.findById(operatorId);
  if (!operator) throw new Error('Operator not found');

  const user = await User.findById(operator.user);

  // Delete Firebase Auth user
  if (user?.firebaseUid) {
    try {
      await admin.auth().deleteUser(user.firebaseUid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }
  }

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.delete',
    metadata: { companyName: operator.companyName, email: user?.email },
    req
  });

  await Operator.findByIdAndDelete(operatorId);
  if (user) await User.findByIdAndDelete(user._id);

  return { deleted: true };
}

/**
 * Send a Firebase password reset email to an operator.
 */
export async function triggerPasswordReset({ operatorId, adminUser, req }) {
  const operator = await Operator.findById(operatorId).populate('user', 'email firebaseUid');
  if (!operator?.user?.email) throw new Error('Operator or email not found');

  const link = await admin.auth().generatePasswordResetLink(operator.user.email);

  await logAudit({
    adminId: adminUser._id,
    operatorId: operator._id,
    action: 'operator.password_reset',
    metadata: { email: operator.user.email },
    req
  });

  return { email: operator.user.email, resetLink: link };
}

/**
 * Platform revenue stats.
 */
export async function getRevenue() {
  const pipeline = [
    { $match: { status: { $in: ['paid', 'refunded'] } } },
    { $group: { _id: null, totalPaid: { $sum: '$amount' }, count: { $sum: 1 } } }
  ];
  const result = await Payment.aggregate(pipeline);
  return result[0] || { totalPaid: 0, count: 0 };
}

/**
 * Paginated audit logs.
 */
export async function getAuditLogs({ page = 1, limit = 50, adminId, action }) {
  const query = {};
  if (adminId) query.adminId = adminId;
  if (action) query.action = action;

  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .populate('adminId', 'name email')
    .populate('operatorId', 'companyName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}

/**
 * Full payment ledger with filters, pagination, and deep population.
 */
export async function getPayments({ page = 1, limit = 20, status, search, from, to, operatorId }) {
  const match = {};
  if (status) match.status = status;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  let payments = await Payment.find(match)
    .sort({ createdAt: -1 })
    .populate({
      path: 'booking',
      select: '_id seats status amount',
      populate: [
        { path: 'user', select: 'name email phone' },
        { path: 'operator', select: 'companyName' },
        { path: 'route', select: 'from to departureTime' }
      ]
    })
    .lean();

  // Apply search filter (Razorpay ID, booking ID, customer email)
  if (search) {
    const q = search.toLowerCase();
    payments = payments.filter(p =>
      p.razorpayPaymentId?.toLowerCase().includes(q) ||
      p.razorpayOrderId?.toLowerCase().includes(q) ||
      p.booking?._id?.toString().includes(q) ||
      p.booking?.user?.email?.toLowerCase().includes(q)
    );
  }

  // Apply operatorId filter after populate
  if (operatorId) {
    payments = payments.filter(p =>
      p.booking?.operator?._id?.toString() === operatorId
    );
  }

  const total = payments.length;
  const paginated = payments.slice((page - 1) * limit, page * limit);

  // Flatten nested structure for frontend convenience
  const flattened = paginated.map(p => ({
    _id: p._id,
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    createdAt: p.createdAt,
    refundId: p.refundId,
    refundAmount: p.refundAmount,
    booking: p.booking ? { _id: p.booking._id, seats: p.booking.seats, status: p.booking.status } : null,
    user: p.booking?.user || null,
    operator: p.booking?.operator || null,
    route: p.booking?.route || null,
  }));

  return { payments: flattened, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}

/**
 * Platform-wide analytics — monthly revenue, bookings by status, top operators, top routes.
 */
export async function getPlatformAnalytics() {
  const Booking = (await import('../models/Booking.js')).default;

  // Monthly revenue (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const revenueByMonthRaw = await Payment.aggregate([
    { $match: { status: { $in: ['paid', 'refunded'] }, createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueByMonth = revenueByMonthRaw.map(r => ({
    month: `${MONTHS[r._id.month - 1]} ${r._id.year}`,
    revenue: r.revenue,
    count: r.count
  }));

  // Bookings by status
  const statusAgg = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const bookingsByStatus = statusAgg.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});

  // Top 5 operators by revenue
  const operatorAgg = await Booking.aggregate([
    { $match: { status: { $in: ['paid', 'confirmed'] } } },
    { $group: { _id: '$operator', revenue: { $sum: '$amount' }, bookings: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'operators', localField: '_id', foreignField: '_id', as: 'op' } },
    { $unwind: { path: '$op', preserveNullAndEmptyArrays: true } },
    { $project: { companyName: '$op.companyName', revenue: 1, bookings: 1 } }
  ]);

  // Top 5 routes by booking count
  const routeAgg = await Booking.aggregate([
    { $match: { status: { $in: ['paid', 'confirmed'] } } },
    { $lookup: { from: 'routes', localField: 'route', foreignField: '_id', as: 'rt' } },
    { $unwind: { path: '$rt', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { from: '$rt.from', to: '$rt.to' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { from: '$_id.from', to: '$_id.to', count: 1, _id: 0 } }
  ]);

  return {
    revenueByMonth,
    bookingsByStatus,
    operatorBreakdown: operatorAgg,
    topRoutes: routeAgg
  };
}

/**
 * Rich operator details — profile + recent bookings + revenue summary.
 */
export async function getOperatorDetails(operatorId) {
  const Booking = (await import('../models/Booking.js')).default;
  const Route = (await import('../models/Route.js')).default;

  const operator = await Operator.findById(operatorId)
    .populate('user', 'name email phone status verified createdAt')
    .populate('approvedBy', 'name email')
    .lean();

  if (!operator) return null;

  // Recent 10 bookings
  const recentBookings = await Booking.find({ operator: operatorId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'name email')
    .populate('route', 'from to departureTime')
    .populate('payment', 'razorpayPaymentId status amount')
    .lean();

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const revenueAgg = await Booking.aggregate([
    { $match: { operator: operator._id, status: { $in: ['paid', 'confirmed'] }, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue = revenueAgg.map(r => ({
    month: `${MONTHS[r._id.month - 1]} ${r._id.year}`,
    revenue: r.revenue
  }));

  // Total revenue
  const totalRevenueAgg = await Booking.aggregate([
    { $match: { operator: operator._id, status: { $in: ['paid', 'confirmed'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

  // Route count
  const routeCount = await Route.countDocuments({ operator: operatorId, status: 'active' });

  return {
    operator,
    recentBookings,
    revenueSummary: { total: totalRevenue, monthly: monthlyRevenue },
    routeCount
  };
}

