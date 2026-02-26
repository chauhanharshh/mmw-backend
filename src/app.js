import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes/index.js';
import config from './config/index.js';
import { apiLimiter, authLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { webhookController } from './controllers/paymentController.js';
import healthRoutes from './routes/healthRoutes.js';
import logger from './utils/logger.js';

const app = express();

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    const allowed = config.cors.origins;

    // Explicitly disallow wildcard in production
    const isWildcardAllowed = allowed.includes('*') && config.env !== 'production';

    if (isWildcardAllowed || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // Fail properly without throwing 500 internal server error
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  optionsSuccessStatus: 204
};

// Handle preflight (OPTIONS) requests for every route before anything else
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Logging with request ID
morgan.token('id', (req) => req.id);
const morganFormat =
  config.env === 'production'
    ? ':remote-addr - :id ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : ':id :method :url :status :response-time ms';

app.use(morgan(morganFormat));

// Compression
app.use(compression());

// Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (before rate limiting)
app.use('/api/health', healthRoutes);

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// API routes
app.use('/api', routes);

// Razorpay webhook route — must use raw body for signature verification
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '10mb' }),
  webhookController
);

// Root health check for Render
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend running' });
});

// 404 and error handling
app.use(notFound);
app.use(errorHandler);

// Log app startup
logger.info('Express app configured', {
  environment: config.env,
  port: config.port
});

export default app;

