import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Cache key generators
export const cacheKeys = {
  userState: (userId: string) => `user:state:${userId}`,
  questionPool: (difficulty: number) => `questions:difficulty:${difficulty}`,
  leaderboardScore: (limit: number) => `leaderboard:score:${limit}`,
  leaderboardScorePattern: () => 'leaderboard:score:*',
  leaderboardStreak: (limit: number) => `leaderboard:streak:${limit}`,
  leaderboardStreakPattern: () => 'leaderboard:streak:*',
  userMetrics: (userId: string) => `user:metrics:${userId}`,
};

// Cache TTLs (in seconds)
export const cacheTTL = {
  userState: 3600, // 1 hour
  questionPool: 86400, // 24 hours
  leaderboardScore: 10, // 10 seconds for real-time updates
  leaderboardStreak: 10, // 10 seconds
  userMetrics: 60, // 1 minute
};
