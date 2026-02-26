import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

export async function connectDB() {
  try {
    if (!config.mongo.uri) {
      logger.error('MongoDB connection error', { error: 'MONGO_URI is missing or undefined' });
      process.exit(1);
    }
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongo.uri, {
      dbName: config.mongo.dbName
    });
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error', { error: err.message });
    process.exit(1);
  }
}


