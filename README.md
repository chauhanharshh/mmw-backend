# MapsMyWay Backend

Production-ready Node.js + Express + MongoDB backend for the MapsMyWay helicopter booking aggregator platform.

## 🚀 Features

- **Authentication**: Firebase Admin SDK with role-based access control (user, operator, admin)
- **Route Management**: Search, filter, and manage helicopter routes
- **Booking System**: Seat locking (10 minutes), status management, transaction safety
- **Payment Integration**: Razorpay with order creation, verification, refunds, and webhooks
- **Operator Module**: Route management and booking views for operators
- **Admin Module**: Operator approval, revenue tracking, commission management
- **Security**: Rate limiting, CORS, Helmet, input validation, request ID tracking
- **Production Ready**: Health checks, graceful shutdown, structured logging, error handling

## 📋 Tech Stack

- **Runtime**: Node.js (>= 18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: Firebase Admin SDK
- **Payments**: Razorpay
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: Joi
- **Logging**: Winston
- **Architecture**: MVC pattern

## 📁 Folder Structure

```
backend/
├── src/
│   ├── config/          # Configuration (DB, Firebase, Razorpay, env)
│   ├── models/          # Mongoose models (User, Operator, Route, Booking, Payment)
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic layer
│   ├── routes/          # Express route definitions
│   ├── middlewares/     # Auth, validation, rate limiting, error handling
│   ├── utils/           # Utilities (logger, errors, response helpers)
│   ├── app.js           # Express app configuration
│   └── server.js         # Server startup and graceful shutdown
├── docs/                # API documentation, deployment guides
├── package.json
└── README.md
```

## 🛠️ Setup

### Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account (or local MongoDB)
- Firebase project with Admin SDK credentials
- Razorpay account (test/live keys)

### Installation

1. **Install dependencies**

```bash
cd backend
npm install
```

2. **Configure environment variables**

Copy `ENV.sample` to `.env` and fill in your values:

```env
# Server
NODE_ENV=development
PORT=4000

# MongoDB
MONGO_URI=process.env.MONGO_URI
MONGO_DB_NAME=mapsmyway

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Booking
SEAT_LOCK_MINUTES=10
```

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`, replace actual newlines with `\n` (two characters)
- Or use Firebase service account JSON file (see `src/config/firebase.js`)
- Never commit `.env` file to version control

3. **Run the server**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will:
- Validate environment variables
- Connect to MongoDB
- Initialize Firebase Admin SDK
- Start listening on configured port

## 📡 API Endpoints

Base URL: `http://localhost:4000/api`

### Health Check

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health with service status

### Authentication

All protected endpoints require Firebase ID token in header:
```
Authorization: Bearer <firebase-id-token>
```

- `GET /api/auth/me` - Get current user profile

### Routes

- `GET /api/routes/search` - Search routes (public)
  - Query params: `from`, `to`, `date`, `seats`, `page`, `limit`

### Bookings

- `POST /api/bookings/create` - Create booking (user)
- `POST /api/bookings/cancel` - Cancel booking (user/operator/admin)
- `GET /api/bookings/user` - Get user's bookings (user)

### Payments

- `POST /api/payments/order` - Create Razorpay order (user)
- `POST /api/payments/verify` - Verify payment signature (user)
- `POST /api/payments/refund` - Process refund (operator/admin)
- `POST /api/payments/webhook` - Razorpay webhook handler

### Operator

- `POST /api/operator/route` - Create/update route (operator)
- `GET /api/operator/bookings` - Get operator bookings (operator)

### Admin

- `POST /api/admin/approve` - Approve operator (admin)
- `GET /api/admin/revenue` - Get revenue statistics (admin)

See `docs/api.md` for detailed request/response schemas.

## 🔒 Security Features

- **Authentication**: Firebase ID token verification
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Per-route rate limits (auth, API, payments)
- **Input Validation**: Joi schema validation on all endpoints
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Request ID**: Unique ID for request tracing
- **Error Handling**: Standardized error responses (no stack traces in production)

## 📊 Response Format

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
    "requestId": "unique-request-id"
  }
}
```

## 🧪 Testing

### Health Check

```bash
curl http://localhost:4000/api/health
```

### Search Routes

```bash
curl "http://localhost:4000/api/routes/search?from=Mumbai&to=Goa&date=2024-12-25"
```

### Authenticated Request

```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  http://localhost:4000/api/auth/me
```

## 🚢 Deployment

See `docs/deployment.md` for:
- AWS deployment (Elastic Beanstalk, ECS, EC2)
- GCP deployment (Cloud Run, App Engine)
- Docker configuration
- Environment variable management
- Production best practices

## 📚 Documentation

- **API Reference**: `docs/api.md`
- **Frontend Integration**: `docs/FRONTEND_INTEGRATION.md`
- **Deployment Guide**: `docs/deployment.md`

## 🔧 Development

### Project Structure

- **Models**: Mongoose schemas with indexes and relationships
- **Services**: Business logic, database operations, external API calls
- **Controllers**: HTTP request/response handling, validation
- **Routes**: Express route definitions with middleware
- **Middlewares**: Reusable middleware functions

### Adding New Features

1. Create/update Mongoose model in `models/`
2. Implement business logic in `services/`
3. Create controller in `controllers/`
4. Define routes in `routes/`
5. Add validation schemas using Joi
6. Update API documentation

### Logging

Structured logging with Winston:
- Development: Console output with colors
- Production: JSON format for log aggregation

Log levels: `error`, `warn`, `info`, `debug`

### Error Handling

- Use `ApiError` class for application errors
- Errors are automatically caught and formatted
- Request ID included in all error responses
- Stack traces only in development mode

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Verify `MONGO_URI` is correct
- Check MongoDB Atlas IP whitelist
- Ensure network connectivity

### Firebase Initialization Errors

- Verify service account credentials
- Check `FIREBASE_PRIVATE_KEY` format (newlines as `\n`)
- Ensure Firebase Admin SDK is properly configured

### Razorpay Payment Issues

- Verify API keys are correct
- Check webhook secret matches Razorpay dashboard
- Ensure webhook URL is accessible from internet

### CORS Errors

- Add frontend origin to `CORS_ORIGINS`
- Check preflight requests are handled
- Verify credentials are included if needed

## 📝 License

Private - MapsMyWay Platform

## 🤝 Support

For issues or questions:
1. Check documentation in `docs/`
2. Review error messages and request IDs
3. Check server logs for detailed information
