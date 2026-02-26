import asyncHandler from '../utils/asyncHandler.js';
import mongoose from 'mongoose';
import admin from '../config/firebase.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Health check endpoint
 * GET /api/health
 */
export const healthCheck = asyncHandler(async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(health);
});

/**
 * Detailed health check with service status
 * GET /api/health/detailed
 */
export const detailedHealthCheck = asyncHandler(async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };

  // MongoDB check
  try {
    const mongoState = mongoose.connection.readyState;
    checks.services.mongodb = {
      status: mongoState === 1 ? 'connected' : 'disconnected',
      state: mongoState
    };
  } catch (error) {
    checks.services.mongodb = {
      status: 'error',
      error: error.message
    };
    checks.status = 'degraded';
  }

  // Firebase check
  try {
    if (admin.apps.length > 0) {
      checks.services.firebase = {
        status: 'initialized'
      };
    } else {
      checks.services.firebase = {
        status: 'not_initialized'
      };
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.services.firebase = {
      status: 'error',
      error: error.message
    };
    checks.status = 'degraded';
  }

  // Razorpay check (basic config check)
  try {
    if (config.razorpay.keyId && config.razorpay.keySecret) {
      checks.services.razorpay = {
        status: 'configured'
      };
    } else {
      checks.services.razorpay = {
        status: 'not_configured'
      };
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.services.razorpay = {
      status: 'error',
      error: error.message
    };
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});
