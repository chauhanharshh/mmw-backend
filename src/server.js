import app from './app.js';
import config from './config/index.js';
import { connectDB } from './config/db.js';
import { bootstrapAdmin } from './scripts/bootstrapAdmin.js';
import logger from './utils/logger.js';
import mongoose from 'mongoose';

let server;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connections
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
  }

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  process.exit(0);
}

/**
 * Validate environment variables on startup
 */
function validateEnvironment() {
  const required = [
    'MONGO_URI',
    'FIREBASE_PROJECT_ID',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  logger.info('Environment variables validated');
}

/**
 * Start server
 */
async function start() {
  try {
    // Validate environment
    validateEnvironment();

    // Connect to database
    await connectDB();

    // Bootstrap admin account (idempotent — safe to call on every restart)
    await bootstrapAdmin();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`MapsMyWay backend listening on port ${config.port}`, {
        environment: config.env,
        nodeVersion: process.version,
        pid: process.pid
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at Promise', { reason, promise });
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle termination signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof config.port === 'string' ? `Pipe ${config.port}` : `Port ${config.port}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

start();

