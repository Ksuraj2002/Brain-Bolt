import { redisClient, cacheKeys, cacheTTL } from './../redis';
import { Question } from './userService';
import QuestionModel from '../models/Question';
import crypto from 'crypto';

/**
 * Hash answer for secure comparison
 */
export function hashAnswer(answer: string): string {
  return crypto.createHash('sha256').update(answer.toLowerCase().trim()).digest('hex');
}

/**
 * Get a random question by difficulty
 */
export async function getQuestionByDifficulty(
  difficulty: number,
  excludeQuestionIds: string[] = []
): Promise<Question | null> {
  const cacheKey = cacheKeys.questionPool(difficulty);
  
  // Try cache first
  const cached = await redisClient.get(cacheKey);
  let questionIds: string[];

  if (cached) {
    questionIds = JSON.parse(cached);
  } else {
    // Load from database
    const questions = await QuestionModel.find({ difficulty }, '_id').lean();
    questionIds = questions.map((q) => q._id.toString());
    
    // Cache for 24 hours
    await redisClient.setEx(cacheKey, cacheTTL.questionPool, JSON.stringify(questionIds));
  }

  // Filter out excluded questions
  const availableIds = questionIds.filter((id) => !excludeQuestionIds.includes(id));

  if (availableIds.length === 0) {
    return null;
  }

  // Select random question
  const randomIndex = Math.floor(Math.random() * availableIds.length);
  const questionId = availableIds[randomIndex];

  // Get full question details
  const question = await QuestionModel.findById(questionId).lean();

  if (!question) {
    return null;
  }

  return {
    id: question._id.toString(),
    difficulty: question.difficulty,
    prompt: question.prompt,
    choices: question.choices,
    correctAnswerHash: question.correctAnswerHash,
  };
}

/**
 * Verify answer
 */
export function verifyAnswer(question: Question, userAnswer: string): boolean {
  const userAnswerHash = hashAnswer(userAnswer);
  return userAnswerHash === question.correctAnswerHash;
}
