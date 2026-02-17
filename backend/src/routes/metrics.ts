import { Router } from 'express';
import { getUserState } from '../services/userService';
import { redisClient, cacheKeys, cacheTTL } from '../redis';
import AnswerLogModel from '../models/AnswerLog';

export const metricsRouter = Router();

/**
 * GET /v1/quiz/metrics
 * Get user metrics and performance data
 */
metricsRouter.get('/metrics', async (req, res) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const cacheKey = cacheKeys.userMetrics(userId);
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const state = await getUserState(userId);

    // Get answer history for accuracy calculation
    const answerHistory = await AnswerLogModel.find({ userId })
      .sort({ answeredAt: -1 })
      .limit(100)
      .lean();

    const totalAnswers = answerHistory.length;
    const correctAnswers = answerHistory.filter((row) => row.correct).length;
    const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

    // Difficulty histogram (last 50 answers)
    const recentAnswers = answerHistory.slice(0, 50);
    const difficultyHistogram: Record<number, number> = {};
    recentAnswers.forEach((row) => {
      const diff = row.difficulty;
      difficultyHistogram[diff] = (difficultyHistogram[diff] || 0) + 1;
    });

    // Recent performance (last 10 answers)
    const recentPerformance = recentAnswers.slice(0, 10).map((row) => ({
      correct: row.correct,
      difficulty: row.difficulty,
      answeredAt: row.answeredAt,
    }));

    const metrics = {
      currentDifficulty: state.currentDifficulty,
      streak: state.streak,
      maxStreak: state.maxStreak,
      totalScore: state.totalScore,
      accuracy: Math.round(accuracy * 100) / 100,
      difficultyHistogram,
      recentPerformance,
    };

    // Cache for 1 minute
    await redisClient.setEx(cacheKey, cacheTTL.userMetrics, JSON.stringify(metrics));

    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
