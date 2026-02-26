import Operator from '../models/Operator.js';
import Booking from '../models/Booking.js';
import Route from '../models/Route.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status-codes';

export async function ensureOperator(user) {
  const operator = await Operator.findOne({ user: user._id });
  if (!operator) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Operator profile not found');
  }
  if (operator.status !== 'active' && operator.status !== 'approved') {
    // Throw a descriptive error so the frontend can detect the exact state
    const msg =
      operator.status === 'pending' ? 'Operator account is pending admin approval' :
        operator.status === 'suspended' ? 'Operator account is suspended' :
          operator.status === 'rejected' ? 'Operator application was rejected' :
            'Operator not approved';
    throw new ApiError(httpStatus.FORBIDDEN, msg);
  }
  return operator;
}

export async function operatorCreateOrUpdateRoute({ user, routeId, payload }) {
  const operator = await ensureOperator(user);
  const criteria = routeId ? { _id: routeId, operator: operator._id } : null;

  if (criteria) {
    return Route.findOneAndUpdate(criteria, payload, { new: true });
  }

  return Route.create({
    ...payload,
    operator: operator._id
  });
}

// Enhanced: populates payment + full user info for booking detail modal
export async function getOperatorBookingsForUser(user) {
  const operator = await ensureOperator(user);
  return Booking.find({ operator: operator._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'route' })
    .populate({ path: 'user', select: 'name email phone' })
    .populate({ path: 'payment', select: 'razorpayOrderId razorpayPaymentId status amount refundId refundAmount createdAt' })
    .lean();
}

// New: list operator's own routes with booked seat counts
export async function getOperatorRoutesForUser(user) {
  const operator = await ensureOperator(user);
  const routes = await Route.find({ operator: operator._id })
    .sort({ departureTime: -1 })
    .lean();

  // Attach booked seat counts per route
  const routeIds = routes.map(r => r._id);
  const bookedAgg = await Booking.aggregate([
    { $match: { route: { $in: routeIds }, status: { $in: ['paid', 'confirmed'] } } },
    { $group: { _id: '$route', bookedSeats: { $sum: '$seats' } } }
  ]);
  const bookedMap = bookedAgg.reduce((acc, r) => { acc[r._id.toString()] = r.bookedSeats; return acc; }, {});

  return routes.map(r => ({ ...r, bookedSeats: bookedMap[r._id.toString()] || 0 }));
}

// New: operator-level analytics
export async function getOperatorAnalyticsForUser(user) {
  const operator = await ensureOperator(user);
  const operatorId = operator._id;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const revenueAgg = await Booking.aggregate([
    { $match: { operator: operatorId, status: { $in: ['paid', 'confirmed'] }, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$amount' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  const revenueByMonth = revenueAgg.map(r => ({
    month: `${MONTHS[r._id.month - 1]} ${r._id.year}`,
    revenue: r.revenue,
    bookings: r.bookings
  }));

  // Cancellation rate
  const totalBookings = await Booking.countDocuments({ operator: operatorId });
  const cancelledBookings = await Booking.countDocuments({ operator: operatorId, status: 'cancelled' });
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

  // Seat utilization (booked vs total across active routes)
  const routes = await Route.find({ operator: operatorId, status: 'active' }).lean();
  const totalSeats = routes.reduce((s, r) => s + r.totalSeats, 0);
  const bookedAgg = await Booking.aggregate([
    { $match: { operator: operatorId, status: { $in: ['paid', 'confirmed'] } } },
    { $group: { _id: null, total: { $sum: '$seats' } } }
  ]);
  const bookedSeats = bookedAgg[0]?.total || 0;
  const seatUtilization = totalSeats > 0 ? Math.min(100, Math.round((bookedSeats / totalSeats) * 100)) : 0;

  // Popular routes
  const popularRoutesAgg = await Booking.aggregate([
    { $match: { operator: operatorId, status: { $in: ['paid', 'confirmed'] } } },
    { $lookup: { from: 'routes', localField: 'route', foreignField: '_id', as: 'rt' } },
    { $unwind: { path: '$rt', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { from: '$rt.from', to: '$rt.to' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { from: '$_id.from', to: '$_id.to', count: 1, _id: 0 } }
  ]);

  // Monthly summary (last 6 months)
  const summaryAgg = await Booking.aggregate([
    { $match: { operator: operatorId, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, status: '$status' },
        count: { $sum: 1 },
        revenue: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Pivot summary by month
  const summaryMap = {};
  for (const r of summaryAgg) {
    const key = `${MONTHS[r._id.month - 1]} ${r._id.year}`;
    if (!summaryMap[key]) summaryMap[key] = { month: key, bookings: 0, revenue: 0, cancellations: 0 };
    summaryMap[key].bookings += r.count;
    if (['paid', 'confirmed'].includes(r._id.status)) summaryMap[key].revenue += r.revenue;
    if (r._id.status === 'cancelled') summaryMap[key].cancellations += r.count;
  }
  const monthlySummary = Object.values(summaryMap);

  return { revenueByMonth, seatUtilization, cancellationRate, popularRoutes: popularRoutesAgg, monthlySummary };
}
