# MapsMyWay Backend API Documentation

Base URL: `/api`

All authenticated routes require a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

## Response Format

All API responses follow a standardized format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "requestId": "unique-request-id",
    "details": {}
  }
}
```

All responses include an `X-Request-ID` header for request tracking.

## Health Check

### GET `/api/health`

Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-20T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### GET `/api/health/detailed`

Detailed health check with service status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-20T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "mongodb": {
      "status": "connected",
      "state": 1
    },
    "firebase": {
      "status": "initialized"
    },
    "razorpay": {
      "status": "configured"
    }
  }
}
```

## Authentication

### GET `/api/auth/me`

Get current authenticated user profile.

**Authentication:** Required (User/Operator/Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "firebaseUid": "firebase_uid",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1234567890",
      "role": "user",
      "isOperatorApproved": false,
      "createdAt": "2024-12-20T10:00:00.000Z",
      "updatedAt": "2024-12-20T10:00:00.000Z"
    }
  }
}
```

## Routes

### GET `/api/routes/search`

Search for available helicopter routes.

**Authentication:** Not required (Public)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | No | Departure location (case-insensitive partial match) |
| `to` | string | No | Arrival location (case-insensitive partial match) |
| `date` | ISO date | No | Filter by departure date (YYYY-MM-DD) |
| `seats` | integer | No | Minimum available seats required |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Results per page (default: 20, max: 100) |

**Example Request:**
```
GET /api/routes/search?from=Mumbai&to=Goa&date=2024-12-25&seats=2&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "_id": "route_id",
        "from": "Mumbai",
        "to": "Goa",
        "departureTime": "2024-12-25T10:00:00.000Z",
        "arrivalTime": "2024-12-25T11:30:00.000Z",
        "basePrice": 5000,
        "currency": "INR",
        "totalSeats": 6,
        "availableSeats": 4,
        "bookedSeats": 2,
        "status": "active",
        "operator": {
          "_id": "operator_id",
          "companyName": "Heli Tours"
        },
        "createdAt": "2024-12-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Bookings

### POST `/api/bookings/create`

Create a new booking. Seats are locked for 10 minutes (configurable).

**Authentication:** Required (User)

**Request Body:**
```json
{
  "routeId": "route_id",
  "seats": 2
}
```

**Validation:**
- `routeId`: Required, string
- `seats`: Required, integer, min: 1, max: 50

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "_id": "booking_id",
      "user": "user_id",
      "operator": "operator_id",
      "route": {
        "_id": "route_id",
        "from": "Mumbai",
        "to": "Goa",
        "departureTime": "2024-12-25T10:00:00.000Z"
      },
      "seats": 2,
      "status": "pending",
      "amount": 10000,
      "currency": "INR",
      "seatLockExpiresAt": "2024-12-20T10:10:00.000Z",
      "createdAt": "2024-12-20T10:00:00.000Z"
    }
  },
  "message": "Booking created successfully. Please complete payment within 10 minutes."
}
```

**Error Responses:**
- `404`: Route not found or inactive
- `400`: Not enough seats available
- `400`: Operator not approved

### POST `/api/bookings/cancel`

Cancel a booking.

**Authentication:** Required (User/Operator/Admin)

**Request Body:**
```json
{
  "bookingId": "booking_id"
}
```

**Validation:**
- `bookingId`: Required, string

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "_id": "booking_id",
      "status": "cancelled",
      "seatLockExpiresAt": "2024-12-20T10:00:00.000Z",
      ...
    }
  },
  "message": "Booking cancelled successfully"
}
```

**Error Responses:**
- `404`: Booking not found
- `403`: Cannot cancel this booking (insufficient permissions)

### GET `/api/bookings/user`

Get all bookings for the current user.

**Authentication:** Required (User)

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "booking_id",
        "route": {
          "_id": "route_id",
          "from": "Mumbai",
          "to": "Goa",
          "departureTime": "2024-12-25T10:00:00.000Z"
        },
        "seats": 2,
        "status": "paid",
        "amount": 10000,
        "currency": "INR",
        "createdAt": "2024-12-20T10:00:00.000Z"
      }
    ]
  }
}
```

## Payments

### POST `/api/payments/order`

Create a Razorpay payment order for a booking.

**Authentication:** Required (User)

**Request Body:**
```json
{
  "bookingId": "booking_id"
}
```

**Validation:**
- `bookingId`: Required, string

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_xxxxx",
      "entity": "order",
      "amount": 1000000,
      "amount_paid": 0,
      "amount_due": 1000000,
      "currency": "INR",
      "receipt": "booking_booking_id",
      "status": "created",
      "notes": {
        "bookingId": "booking_id",
        "userId": "user_id"
      },
      "created_at": 1703068800
    },
    "paymentId": "payment_id"
  },
  "message": "Payment order created successfully"
}
```

**Error Responses:**
- `404`: Booking not found
- `403`: Cannot create order for this booking
- `400`: Booking already paid or cancelled

### POST `/api/payments/verify`

Verify Razorpay payment signature and update booking status.

**Authentication:** Required (User)

**Request Body:**
```json
{
  "bookingId": "booking_id",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_hash"
}
```

**Validation:**
- `bookingId`: Required, string
- `razorpay_order_id`: Required, string
- `razorpay_payment_id`: Required, string
- `razorpay_signature`: Required, string

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "_id": "payment_id",
      "booking": "booking_id",
      "razorpayOrderId": "order_xxxxx",
      "razorpayPaymentId": "pay_xxxxx",
      "status": "paid",
      "amount": 10000,
      "currency": "INR",
      "createdAt": "2024-12-20T10:00:00.000Z"
    },
    "message": "Payment verified successfully"
  }
}
```

**Error Responses:**
- `404`: Payment record not found
- `400`: Invalid payment signature

### POST `/api/payments/refund`

Process a refund for a payment.

**Authentication:** Required (Operator/Admin)

**Request Body:**
```json
{
  "paymentId": "payment_id",
  "amount": 5000,
  "reason": "Customer request"
}
```

**Validation:**
- `paymentId`: Required, string
- `amount`: Optional, number, positive (full refund if omitted)
- `reason`: Optional, string, max 500 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "_id": "payment_id",
      "status": "refunded",
      "refundId": "rfnd_xxxxx",
      "refundAmount": 5000,
      ...
    },
    "refund": {
      "id": "rfnd_xxxxx",
      "entity": "refund",
      "amount": 500000,
      "currency": "INR",
      "payment_id": "pay_xxxxx",
      "status": "processed",
      ...
    }
  },
  "message": "Refund processed successfully"
}
```

**Error Responses:**
- `404`: Payment not found
- `400`: Only paid payments can be refunded
- `400`: Refund amount exceeds payment amount

### POST `/api/payments/webhook`

Razorpay webhook endpoint for payment events.

**Authentication:** Razorpay signature verification

**Headers:**
- `X-Razorpay-Signature`: HMAC signature

**Request Body:** Raw JSON payload from Razorpay

**Supported Events:**
- `payment.captured`: Payment successful
- `refund.created`: Refund initiated
- `refund.processed`: Refund completed

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Error Responses:**
- `400`: Missing or invalid signature

## Operator

### POST `/api/operator/route`

Create or update a helicopter route.

**Authentication:** Required (Operator - approved)

**Request Body:**
```json
{
  "routeId": "route_id",
  "from": "Mumbai",
  "to": "Goa",
  "departureTime": "2024-12-25T10:00:00.000Z",
  "arrivalTime": "2024-12-25T11:30:00.000Z",
  "basePrice": 5000,
  "currency": "INR",
  "totalSeats": 6,
  "status": "active"
}
```

**Validation:**
- `routeId`: Optional, string (for updates)
- `from`: Required, string, min: 2, max: 100
- `to`: Required, string, min: 2, max: 100
- `departureTime`: Required, ISO date
- `arrivalTime`: Required, ISO date, must be after departureTime
- `basePrice`: Required, number, positive
- `currency`: Optional, string, length: 3, default: "INR"
- `totalSeats`: Required, integer, min: 1, max: 100
- `status`: Optional, enum: ["active", "inactive"]

**Response:**
```json
{
  "success": true,
  "data": {
    "route": {
      "_id": "route_id",
      "operator": {
        "_id": "operator_id",
        "companyName": "Heli Tours"
      },
      "from": "Mumbai",
      "to": "Goa",
      "departureTime": "2024-12-25T10:00:00.000Z",
      "arrivalTime": "2024-12-25T11:30:00.000Z",
      "basePrice": 5000,
      "currency": "INR",
      "totalSeats": 6,
      "status": "active",
      "createdAt": "2024-12-20T10:00:00.000Z"
    }
  },
  "message": "Route created successfully"
}
```

**Error Responses:**
- `403`: Operator not approved
- `400`: Validation errors

### GET `/api/operator/bookings`

Get all bookings for the operator's routes.

**Authentication:** Required (Operator - approved)

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "booking_id",
        "user": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "user@example.com"
        },
        "route": {
          "_id": "route_id",
          "from": "Mumbai",
          "to": "Goa"
        },
        "seats": 2,
        "status": "paid",
        "amount": 10000,
        "createdAt": "2024-12-20T10:00:00.000Z"
      }
    ]
  }
}
```

## Admin

### POST `/api/admin/approve`

Approve an operator and set commission rate.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "operatorId": "operator_id",
  "commissionRate": 10
}
```

**Validation:**
- `operatorId`: Required, string
- `commissionRate`: Required, number, min: 0, max: 100

**Response:**
```json
{
  "success": true,
  "data": {
    "operator": {
      "_id": "operator_id",
      "user": {
        "_id": "user_id",
        "name": "Operator Name",
        "email": "operator@example.com"
      },
      "companyName": "Heli Tours",
      "licenseNumber": "LIC123456",
      "status": "approved",
      "commissionRate": 10,
      "updatedAt": "2024-12-20T10:00:00.000Z"
    }
  },
  "message": "Operator approved successfully"
}
```

**Error Responses:**
- `404`: Operator not found
- `400`: Validation errors

### GET `/api/admin/revenue`

Get revenue statistics.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "totalPaid": 500000,
      "count": 50,
      "totalRefunded": 50000,
      "refundCount": 5
    }
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication token missing or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Rate Limiting

- **Auth endpoints**: 5 requests per 15 minutes per IP
- **API endpoints**: 100 requests per 15 minutes per IP
- **Payment endpoints**: 10 requests per 15 minutes per IP

Rate limit headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Request ID

All requests receive a unique `X-Request-ID` header. Use this for:
- Debugging
- Support requests
- Log correlation

## Pagination

Paginated endpoints support:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```
