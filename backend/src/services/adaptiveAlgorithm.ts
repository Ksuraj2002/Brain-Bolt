/**
 * Adaptive Algorithm for Question Difficulty Selection
 * 
 * Prevents ping-pong instability using:
 * - Confidence score (momentum-based)
 * - Hysteresis band (buffer before changing difficulty)
 * - Minimum streak requirement for difficulty increase
 */

export interface AdaptiveState {
  currentDifficulty: number;
  confidenceScore: number; // 0-1, tracks recent performance momentum
  streak: number;
}

export interface AdaptiveConfig {
  minDifficulty: number;
  maxDifficulty: number;
  difficultyStep: number;
  confidenceThreshold: number; // Minimum confidence to increase difficulty
  hysteresisBand: number; // Buffer to prevent oscillation
  minStreakForIncrease: number; // Minimum streak to increase difficulty
  confidenceDecayRate: number; // How fast confidence decays
}

const DEFAULT_CONFIG: AdaptiveConfig = {
  minDifficulty: 1,
  maxDifficulty: 10,
  difficultyStep: 1,
  confidenceThreshold: 0.6, // Need 60% confidence to increase
  hysteresisBand: 0.3, // 30% buffer
  minStreakForIncrease: 2, // Need at least 2 correct in a row
  confidenceDecayRate: 0.1, // 10% decay per wrong answer
};

/**
 * Updates difficulty based on answer correctness
 * Uses confidence score and hysteresis to prevent ping-pong
 */
export function updateDifficulty(
  state: AdaptiveState,
  isCorrect: boolean,
  config: AdaptiveConfig = DEFAULT_CONFIG
): { newDifficulty: number; newConfidence: number } {
  let { currentDifficulty, confidenceScore, streak } = state;
  let newConfidence = confidenceScore;

  if (isCorrect) {
    // Increase confidence on correct answer
    newConfidence = Math.min(1.0, confidenceScore + 0.15);
    
    // Only increase difficulty if:
    // 1. Confidence is above threshold
    // 2. Streak meets minimum requirement
    // 3. Not already at max difficulty
    if (
      newConfidence >= config.confidenceThreshold &&
      streak >= config.minStreakForIncrease &&
      currentDifficulty < config.maxDifficulty
    ) {
      // Apply hysteresis: need confidence above threshold + band
      const increaseThreshold = config.confidenceThreshold + config.hysteresisBand;
      if (newConfidence >= increaseThreshold) {
        currentDifficulty = Math.min(
          config.maxDifficulty,
          currentDifficulty + config.difficultyStep
        );
        // Reset confidence slightly after increase to prevent rapid escalation
        newConfidence = config.confidenceThreshold;
      }
    }
  } else {
    // Decrease confidence on wrong answer
    newConfidence = Math.max(0, confidenceScore - config.confidenceDecayRate);
    
    // Decrease difficulty if confidence drops significantly
    // Use hysteresis: need confidence below threshold - band
    const decreaseThreshold = config.confidenceThreshold - config.hysteresisBand;
    if (
      newConfidence < decreaseThreshold &&
      currentDifficulty > config.minDifficulty
    ) {
      currentDifficulty = Math.max(
        config.minDifficulty,
        currentDifficulty - config.difficultyStep
      );
      // Reset confidence after decrease
      newConfidence = 0.5;
    }
  }

  return {
    newDifficulty: Math.round(currentDifficulty),
    newConfidence: Math.round(newConfidence * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Calculate score delta based on difficulty, correctness, and streak
 */
export function calculateScore(
  difficulty: number,
  isCorrect: boolean,
  streak: number,
  config: AdaptiveConfig = DEFAULT_CONFIG
): number {
  if (!isCorrect) {
    return 0; // No points for wrong answers
  }

  // Base score from difficulty (1-10 maps to 10-100 base points)
  const baseScore = difficulty * 10;

  // Streak multiplier (capped at 3x)
  const streakMultiplier = Math.min(1 + (streak * 0.1), 3.0);

  // Calculate final score
  const score = baseScore * streakMultiplier;

  return Math.round(score * 100) / 100; // Round to 2 decimals
}

/**
 * Get next difficulty level (for question selection)
 * Uses current state to determine appropriate difficulty
 */
export function getNextDifficulty(state: AdaptiveState): number {
  return state.currentDifficulty;
}
