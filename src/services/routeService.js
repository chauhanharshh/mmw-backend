import Route from '../models/Route.js';
import Booking from '../models/Booking.js';
import Operator from '../models/Operator.js';

export async function searchRoutes({ from, to, date, seats, page = 1, limit = 20 }) {
  const query = {
    status: 'active'
  };

  // Filter by location code (exact match — values are canonical codes e.g. KEDAR, DEHRA)
  if (from) {
    query.from = from;
  }
  if (to) {
    query.to = to;
  }

  // Filter by date (only routes departing on or after the specified date)
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.departureTime = { $gte: start, $lte: end };
  } else {
    // If no date specified, only show future routes
    query.departureTime = { $gte: new Date() };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get routes with pagination
  const routesQuery = Route.find(query)
    .populate('operator', 'companyName')
    .sort({ departureTime: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const [routes, total] = await Promise.all([
    routesQuery.exec(),
    Route.countDocuments(query)
  ]);

  // If seats filter is specified, check availability
  if (seats) {
    const now = new Date();
    const routeIds = routes.map((r) => r._id);

    const booked = await Booking.aggregate([
      {
        $match: {
          route: { $in: routeIds },
          status: { $in: ['pending', 'paid', 'confirmed'] },
          $or: [
            { seatLockExpiresAt: null },
            { seatLockExpiresAt: { $gt: now } }
          ]
        }
      },
      {
        $group: {
          _id: '$route',
          seatsBooked: { $sum: '$seats' }
        }
      }
    ]);

    const bookedMap = new Map(booked.map((b) => [String(b._id), b.seatsBooked]));

    // Add availability info to each route
    const routesWithAvailability = routes.map((route) => {
      const used = bookedMap.get(String(route._id)) || 0;
      const available = route.totalSeats - used;
      return {
        ...route,
        availableSeats: available,
        bookedSeats: used
      };
    }).filter((route) => route.availableSeats >= seats);

    return {
      routes: routesWithAvailability,
      pagination: {
        page,
        limit,
        total: routesWithAvailability.length,
        pages: Math.ceil(routesWithAvailability.length / limit)
      }
    };
  }

  // Add availability info even if no seats filter
  const now = new Date();
  const routeIds = routes.map((r) => r._id);

  const booked = await Booking.aggregate([
    {
      $match: {
        route: { $in: routeIds },
        status: { $in: ['pending', 'paid', 'confirmed'] },
        $or: [
          { seatLockExpiresAt: null },
          { seatLockExpiresAt: { $gt: now } }
        ]
      }
    },
    {
      $group: {
        _id: '$route',
        seatsBooked: { $sum: '$seats' }
      }
    }
  ]);

  const bookedMap = new Map(booked.map((b) => [String(b._id), b.seatsBooked]));

  const routesWithAvailability = routes.map((route) => {
    const used = bookedMap.get(String(route._id)) || 0;
    const available = route.totalSeats - used;
    return {
      ...route,
      availableSeats: available,
      bookedSeats: used
    };
  });

  return {
    routes: routesWithAvailability,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function createOrUpdateRoute({ operatorId, routeId, payload }) {
  if (routeId) {
    return Route.findOneAndUpdate(
      { _id: routeId, operator: operatorId },
      payload,
      { new: true }
    );
  }

  return Route.create({
    ...payload,
    operator: operatorId
  });
}

