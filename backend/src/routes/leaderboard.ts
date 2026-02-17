import { Router } from 'express';
import LeaderboardScoreModel from '../models/LeaderboardScore';
import LeaderboardStreakModel from '../models/LeaderboardStreak';
import { redisClient, cacheKeys, cacheTTL } from '../redis';

/**
 * Clear all leaderboard cache entries
 */
async function clearLeaderboardCache() {
  try {
    const scoreKeys = await redisClient.keys(cacheKeys.leaderboardScorePattern());
    const streakKeys = await redisClient.keys(cacheKeys.leaderboardStreakPattern());
    
    console.log('🧹 Clearing leaderboard cache - Score keys:', scoreKeys, 'Streak keys:', streakKeys);
    
    const allKeys = [...scoreKeys, ...streakKeys];
    if (allKeys.length > 0) {
      const deleted = await redisClient.del(allKeys);
      console.log(`✅ Deleted ${deleted} cache entries`);
    }
  } catch (error) {
    console.error('Error clearing leaderboard cache:', error);
  }
}

export const leaderboardRouter = Router();

/**
 * GET /v1/leaderboard/score
 * Get top N users by total score
 */
leaderboardRouter.get('/score', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.userId as string;

    const cacheKey = cacheKeys.leaderboardScore(limit);
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    let leaderboard: any[];

    if (cached) {
      console.log(`📦 Leaderboard cache HIT for key: ${cacheKey}`);
      leaderboard = JSON.parse(cached);
    } else {
      console.log(`📦 Leaderboard cache MISS for key: ${cacheKey}`);
      const results = await LeaderboardScoreModel.find()
        .sort({ totalScore: -1 })
        .limit(limit)
        .lean();

      console.log(`📊 Found ${results.length} results from database`);

      leaderboard = results.map((row, index) => ({
        userId: row.userId,
        totalScore: row.totalScore,
        rank: index + 1,
        updatedAt: row.updatedAt,
      }));

      // Cache for 10 seconds
      await redisClient.setEx(cacheKey, cacheTTL.leaderboardScore, JSON.stringify(leaderboard));
    }

    // Get user's rank if userId provided
    let userRank = null;
    if (userId) {
      const userScore = await LeaderboardScoreModel.findOne({ userId }).lean();
      if (userScore) {
        userRank = await LeaderboardScoreModel.countDocuments({
          totalScore: { $gt: userScore.totalScore }
        }) + 1;
      }
    }

    res.json({
      leaderboard,
      userRank,
    });
  } catch (error) {
    console.error('Error getting score leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /v1/leaderboard/streak
 * Get top N users by max streak
 */
leaderboardRouter.get('/streak', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.userId as string;

    const cacheKey = cacheKeys.leaderboardStreak(limit);
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    let leaderboard: any[];

    if (cached) {
      leaderboard = JSON.parse(cached);
    } else {
      const results = await LeaderboardStreakModel.find()
        .sort({ maxStreak: -1 })
        .limit(limit)
        .lean();

      leaderboard = results.map((row, index) => ({
        userId: row.userId,
        maxStreak: row.maxStreak,
        rank: index + 1,
        updatedAt: row.updatedAt,
      }));

      // Cache for 10 seconds
      await redisClient.setEx(cacheKey, cacheTTL.leaderboardStreak, JSON.stringify(leaderboard));
    }

    // Get user's rank if userId provided
    let userRank = null;
    if (userId) {
      const userStreak = await LeaderboardStreakModel.findOne({ userId }).lean();
      if (userStreak) {
        userRank = await LeaderboardStreakModel.countDocuments({
          maxStreak: { $gt: userStreak.maxStreak }
        }) + 1;
      }
    }

    res.json({
      leaderboard,
      userRank,
    });
  } catch (error) {
    console.error('Error getting streak leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
