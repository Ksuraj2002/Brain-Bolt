import { Router } from 'express';
import { getUserState, updateUserState } from '../services/userService';
import { getQuestionByDifficulty, verifyAnswer } from '../services/questionService';
import { v4 as uuidv4 } from 'uuid';
import QuestionModel from '../models/Question';
import LeaderboardScoreModel from '../models/LeaderboardScore';
import LeaderboardStreakModel from '../models/LeaderboardStreak';
// Note: Do not persist lastQuestionId here; it's updated on answer submission

export const quizRouter = Router();

/**
 * GET /v1/quiz/next
 * Get next question for user
 */
quizRouter.get('/next', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const sessionId = req.query.sessionId as string || uuidv4();

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const state = await getUserState(userId);
    const question = await getQuestionByDifficulty(state.currentDifficulty, 
      state.lastQuestionId ? [state.lastQuestionId] : []
    );

    if (!question) {
      return res.status(404).json({ error: 'No questions available for this difficulty' });
    }

    // Do not persist lastQuestionId here; keeping lastQuestionId updated on answer

    res.json({
      questionId: question.id,
      difficulty: question.difficulty,
      prompt: question.prompt,
      choices: question.choices,
      sessionId,
      stateVersion: state.stateVersion,
      currentScore: state.totalScore,
      currentStreak: state.streak,
    });
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /v1/quiz/answer
 * Submit answer
 */
quizRouter.post('/answer', async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      questionId,
      answer,
      stateVersion,
      answerIdempotencyKey,
    } = req.body;

    if (!userId || !questionId || answer === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate idempotency key if not provided
    const idempotencyKey = answerIdempotencyKey || `${userId}-${questionId}-${Date.now()}`;

    // Get question
    const questionDoc = await QuestionModel.findById(questionId);

    if (!questionDoc) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = {
      id: questionDoc._id.toString(),
      difficulty: questionDoc.difficulty,
      prompt: questionDoc.prompt,
      choices: questionDoc.choices,
      correctAnswerHash: questionDoc.correctAnswerHash,
    };

    // Verify answer
    const isCorrect = verifyAnswer(question, answer);

    // Update user state
    const { newState, scoreDelta } = await updateUserState(
      userId,
      questionId,
      isCorrect,
      idempotencyKey
    );

    // Get leaderboard ranks
    const scoreRank = await LeaderboardScoreModel.countDocuments({
      totalScore: { $gt: newState.totalScore }
    }) + 1;

    const streakRank = await LeaderboardStreakModel.countDocuments({
      maxStreak: { $gt: newState.maxStreak }
    }) + 1;

    res.json({
      correct: isCorrect,
      newDifficulty: newState.currentDifficulty,
      newStreak: newState.streak,
      scoreDelta,
      totalScore: newState.totalScore,
      stateVersion: newState.stateVersion,
      leaderboardRankScore: scoreRank,
      leaderboardRankStreak: streakRank,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
