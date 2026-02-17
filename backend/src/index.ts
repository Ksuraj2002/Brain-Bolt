import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase, initializeDatabase, disconnectDatabase } from './db';
import { redisClient } from './redis';
import { quizRouter } from './routes/quiz';
import { leaderboardRouter } from './routes/leaderboard';
import { metricsRouter } from './routes/metrics';
import { rateLimiter } from './middleware/rateLimiter';
import { seedDatabase } from './migrations/seed';
import QuestionModel from './models/Question';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = require('mongoose');
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis connection
    await redisClient.ping();
    
    res.json({ 
      status: 'ok', 
      database: mongoStatus, 
      redis: 'connected' 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: (error as Error).message });
  }
});

// Routes
app.use('/v1/quiz', quizRouter);
app.use('/v1/leaderboard', leaderboardRouter);
app.use('/v1/quiz', metricsRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log('✅ MongoDB connected');

    // Initialize database indexes
    await initializeDatabase();
    console.log('✅ Database indexes initialized');

    // Seed database if needed
    const questionCount = await QuestionModel.countDocuments();
    if (questionCount === 0) {
      await seedDatabase();
      console.log('✅ Database seeded');
    }

    // Test Redis connection
    await redisClient.connect();
    console.log('✅ Redis connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await disconnectDatabase();
  await redisClient.quit();
  process.exit(0);
});
