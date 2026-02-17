import { redisClient, cacheKeys, cacheTTL } from '../redis';
import { updateDifficulty, calculateScore, AdaptiveState } from './adaptiveAlgorithm';
import UserStateModel from '../models/UserState';
import UserModel from '../models/User';
import AnswerLogModel from '../models/AnswerLog';
import LeaderboardScoreModel from '../models/LeaderboardScore';
import LeaderboardStreakModel from '../models/LeaderboardStreak';
import QuestionModel from '../models/Question';

export interface UserState {
  userId: string;
  currentDifficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  lastQuestionId: string | null;
  lastAnswerAt: Date | null;
  stateVersion: number;
  confidenceScore: number;
}

export interface Question {
  id: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  correctAnswerHash: string;
}

/**
 * Get or create user state
 */
export async function getUserState(userId: string): Promise<UserState> {
  // Try cache first
  const cacheKey = cacheKeys.userState(userId);
  const cached = await redisClient.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  // Check database
  let stateDoc = await UserStateModel.findOne({ userId });

  let state: UserState;

  if (!stateDoc) {
    // Create new user if missing
    await UserModel.findOneAndUpdate(
      { _id: userId },
      { _id: userId },
      { upsert: true, new: true }
    );

    // Use an atomic upsert to avoid duplicate key errors from concurrent requests
    const defaultState = {
      userId,
      currentDifficulty: 1,
      streak: 0,
      maxStreak: 0,
      totalScore: 0,
      lastQuestionId: null,
      lastAnswerAt: null,
      stateVersion: 1,
      confidenceScore: 0.5,
    } as any;

    stateDoc = await UserStateModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: defaultState },
      { upsert: true, new: true }
    );

    state = {
      userId: stateDoc!.userId,
      currentDifficulty: stateDoc!.currentDifficulty,
      streak: stateDoc!.streak,
      maxStreak: stateDoc!.maxStreak,
      totalScore: stateDoc!.totalScore,
      lastQuestionId: stateDoc!.lastQuestionId || null,
      lastAnswerAt: stateDoc!.lastAnswerAt || null,
      stateVersion: stateDoc!.stateVersion,
      confidenceScore: stateDoc!.confidenceScore,
    };
  } else {
    state = {
      userId: stateDoc!.userId,
      currentDifficulty: stateDoc!.currentDifficulty,
      streak: stateDoc!.streak,
      maxStreak: stateDoc!.maxStreak,
      totalScore: stateDoc!.totalScore,
      lastQuestionId: stateDoc!.lastQuestionId || null,
      lastAnswerAt: stateDoc!.lastAnswerAt || null,
      stateVersion: stateDoc!.stateVersion,
      confidenceScore: stateDoc!.confidenceScore,
    };
  }

  // Cache state
  await redisClient.setEx(cacheKey, cacheTTL.userState, JSON.stringify(state));

  return state;
}

/**
 * Update user state after answering
 */
export async function updateUserState(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  idempotencyKey: string
): Promise<{
  newState: UserState;
  scoreDelta: number;
}> {
  // Check idempotency
  const existingAnswer = await AnswerLogModel.findOne({ idempotencyKey });

  if (existingAnswer) {
    // Return existing state
    const state = await getUserState(userId);
    return {
      newState: state,
      scoreDelta: existingAnswer.scoreDelta,
    };
  }

  const currentState = await getUserState(userId);

  // Update adaptive state
  const adaptiveState: AdaptiveState = {
    currentDifficulty: currentState.currentDifficulty,
    confidenceScore: currentState.confidenceScore,
    streak: currentState.streak,
  };

  const { newDifficulty, newConfidence } = updateDifficulty(
    adaptiveState,
    isCorrect
  );

  // Update streak
  let newStreak = isCorrect ? currentState.streak + 1 : 0;
  let newMaxStreak = Math.max(currentState.maxStreak, newStreak);

  // Calculate score
  const scoreDelta = calculateScore(newDifficulty, isCorrect, currentState.streak);
  const newTotalScore = currentState.totalScore + scoreDelta;

  // Update state version
  const newStateVersion = currentState.stateVersion + 1;

  // Update user state (idempotency handled via idempotencyKey)
  const updateResult = await UserStateModel.findOneAndUpdate(
    { userId },
    {
      currentDifficulty: newDifficulty,
      streak: newStreak,
      maxStreak: newMaxStreak,
      totalScore: newTotalScore,
      lastQuestionId: questionId,
      lastAnswerAt: new Date(),
      stateVersion: newStateVersion,
      confidenceScore: newConfidence,
    },
    { new: true }
  );

  if (!updateResult) {
    throw new Error('Failed to update user state');
  }

  // Get question difficulty
  const question = await QuestionModel.findById(questionId);
  const questionDifficulty = question?.difficulty || newDifficulty;

  // Log answer
  await AnswerLogModel.create({
    userId,
    questionId,
    difficulty: questionDifficulty,
    answer: '', // Answer hash stored separately for security
    correct: isCorrect,
    scoreDelta,
    streakAtAnswer: currentState.streak,
    idempotencyKey,
  });

  // Update leaderboards
  await LeaderboardScoreModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        totalScore: newTotalScore,
      }
    },
    { upsert: true, new: true }
  );

  await LeaderboardStreakModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        maxStreak: newMaxStreak,
      }
    },
    { upsert: true, new: true }
  );

  // Invalidate cache
  console.log(`🔄 Invalidating cache for user ${userId}`);
  await redisClient.del(cacheKeys.userState(userId));
  await redisClient.del(cacheKeys.userMetrics(userId));
  
  // Clear all leaderboard cache entries (all limit variations)
  try {
    const scoreKeys = await redisClient.keys(cacheKeys.leaderboardScorePattern());
    const streakKeys = await redisClient.keys(cacheKeys.leaderboardStreakPattern());
    
    console.log('🧹 Invalidating leaderboard - Score keys:', scoreKeys, 'Streak keys:', streakKeys);
    
    const allKeys = [...scoreKeys, ...streakKeys];
    if (allKeys.length > 0) {
      const deleted = await redisClient.del(allKeys);
      console.log(`✅ Invalidated ${deleted} leaderboard cache entries`);
    } else {
      console.log('⚠️  No leaderboard cache keys found to invalidate');
    }
  } catch (error) {
    console.error('Error clearing leaderboard cache:', error);
  }

  const newState: UserState = {
    userId,
    currentDifficulty: newDifficulty,
    streak: newStreak,
    maxStreak: newMaxStreak,
    totalScore: newTotalScore,
    lastQuestionId: questionId,
    lastAnswerAt: new Date(),
    stateVersion: newStateVersion,
    confidenceScore: newConfidence,
  };

  return { newState, scoreDelta };
}
