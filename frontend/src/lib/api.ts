const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Question {
  questionId: string;
  difficulty: number;
  prompt: string;
  choices: string[];
  sessionId: string;
  stateVersion: number;
  currentScore: number;
  currentStreak: number;
}

export interface AnswerResponse {
  correct: boolean;
  newDifficulty: number;
  newStreak: number;
  scoreDelta: number;
  totalScore: number;
  stateVersion: number;
  leaderboardRankScore: number;
  leaderboardRankStreak: number;
}

export interface Metrics {
  currentDifficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  accuracy: number;
  difficultyHistogram: Record<number, number>;
  recentPerformance: Array<{
    correct: boolean;
    difficulty: number;
    answeredAt: string;
  }>;
}

export interface LeaderboardEntry {
  userId: string;
  totalScore?: number;
  maxStreak?: number;
  rank: number;
  updatedAt: string;
}

export async function getNextQuestion(userId: string, sessionId?: string): Promise<Question> {
  const url = new URL(`${API_URL}/v1/quiz/next`);
  url.searchParams.set('userId', userId);
  if (sessionId) {
    url.searchParams.set('sessionId', sessionId);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }
  return response.json();
}

export async function submitAnswer(
  userId: string,
  sessionId: string,
  questionId: string,
  answer: string,
  stateVersion: number,
  idempotencyKey?: string
): Promise<AnswerResponse> {
  const response = await fetch(`${API_URL}/v1/quiz/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      sessionId,
      questionId,
      answer,
      stateVersion,
      answerIdempotencyKey: idempotencyKey || `${userId}-${questionId}-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit answer');
  }
  return response.json();
}

export async function getMetrics(userId: string): Promise<Metrics> {
  const response = await fetch(`${API_URL}/v1/quiz/metrics?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch metrics');
  }
  return response.json();
}

export async function getScoreLeaderboard(userId: string, limit: number = 10): Promise<{
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}> {
  const response = await fetch(
    `${API_URL}/v1/leaderboard/score?userId=${userId}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.json();
}

export async function getStreakLeaderboard(userId: string, limit: number = 10): Promise<{
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}> {
  const response = await fetch(
    `${API_URL}/v1/leaderboard/streak?userId=${userId}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.json();
}
