import dotenv from 'dotenv';

dotenv.config();

const env = process.env;

const config = {
  env: env.NODE_ENV || 'development',
  port: Number(env.PORT) || 4000,
  mongo: {
    uri: process.env.MONGO_URI,
    dbName: env.MONGO_DB_NAME || 'mapsmyway'
  },
  cors: {
    origins: (env.CORS_ORIGINS || '*')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  },
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.GOOGLE_CLIENT_EMAIL,
    // Keep raw; normalization happens in firebase.js to support multiple formats
    privateKey: env.GOOGLE_PRIVATE_KEY || undefined
  },
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET
  },
  booking: {
    seatLockMinutes: Number(env.SEAT_LOCK_MINUTES || 10)
  }
};

export default config;

