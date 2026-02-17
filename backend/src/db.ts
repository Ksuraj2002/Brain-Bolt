import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models to ensure they're registered and schemas are loaded
import './models/User';
import './models/Question';
import './models/UserState';
import './models/AnswerLog';
import './models/LeaderboardScore';
import './models/LeaderboardStreak';

dotenv.config();

/**
 * MongoDB connection
 */
export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/brainbolt';
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Initialize database (MongoDB doesn't need explicit schema creation)
 * Models will create collections and indexes automatically when first used
 */
export async function initializeDatabase() {
  // Models are already imported above, so their schemas are registered
  // MongoDB will create indexes automatically when collections are first created
  console.log('✅ Database ready');
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('✅ MongoDB disconnected');
}
