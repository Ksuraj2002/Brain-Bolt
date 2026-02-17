# Low-Level Design (LLD) Document
## BrainBolt - Adaptive Infinite Quiz Platform

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Frontend  │──────│   Backend   │──────│  PostgreSQL │
│  (Next.js)  │      │  (Express)  │      │  Database   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            │
                      ┌─────────────┐
                      │    Redis    │
                      │    Cache    │
                      └─────────────┘
```

### 1.2 Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose

---

## 2. Database Schema

### 2.1 Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `questions`
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 10),
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_answer_hash TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_difficulty ON questions(difficulty);
```

#### `user_state`
```sql
CREATE TABLE user_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_difficulty INTEGER NOT NULL DEFAULT 5 CHECK (current_difficulty >= 1 AND current_difficulty <= 10),
  streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  total_score DECIMAL(15, 2) NOT NULL DEFAULT 0,
  last_question_id UUID REFERENCES questions(id),
  last_answer_at TIMESTAMP,
  state_version INTEGER NOT NULL DEFAULT 1,
  confidence_score DECIMAL(5, 2) NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_state_user_id ON user_state(user_id);
```

#### `answer_log`
```sql
CREATE TABLE answer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  difficulty INTEGER NOT NULL,
  answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  score_delta DECIMAL(10, 2) NOT NULL,
  streak_at_answer INTEGER NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT UNIQUE
);

CREATE INDEX idx_answer_log_user_id ON answer_log(user_id);
CREATE INDEX idx_answer_log_answered_at ON answer_log(answered_at DESC);
```

#### `leaderboard_score`
```sql
CREATE TABLE leaderboard_score (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_score DECIMAL(15, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_score_total_score ON leaderboard_score(total_score DESC);
```

#### `leaderboard_streak`
```sql
CREATE TABLE leaderboard_streak (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  max_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_streak_max_streak ON leaderboard_streak(max_streak DESC);
```

---

## 3. API Design

### 3.1 Endpoints

#### `GET /v1/quiz/next`
**Request:**
```
Query Parameters:
- userId: string (required)
- sessionId: string (optional)
```

**Response:**
```json
{
  "questionId": "uuid",
  "difficulty": 5,
  "prompt": "What is 2 + 2?",
  "choices": ["3", "4", "5", "6"],
  "sessionId": "uuid",
  "stateVersion": 1,
  "currentScore": 0,
  "currentStreak": 0
}
```

#### `POST /v1/quiz/answer`
**Request:**
```json
{
  "userId": "uuid",
  "sessionId": "uuid",
  "questionId": "uuid",
  "answer": "4",
  "stateVersion": 1,
  "answerIdempotencyKey": "uuid-timestamp"
}
```

**Response:**
```json
{
  "correct": true,
  "newDifficulty": 6,
  "newStreak": 1,
  "scoreDelta": 55.0,
  "totalScore": 55.0,
  "stateVersion": 2,
  "leaderboardRankScore": 1,
  "leaderboardRankStreak": 1
}
```

#### `GET /v1/quiz/metrics`
**Request:**
```
Query Parameters:
- userId: string (required)
```

**Response:**
```json
{
  "currentDifficulty": 5,
  "streak": 3,
  "maxStreak": 5,
  "totalScore": 250.0,
  "accuracy": 0.75,
  "difficultyHistogram": {
    "4": 5,
    "5": 10,
    "6": 3
  },
  "recentPerformance": [
    {
      "correct": true,
      "difficulty": 5,
      "answeredAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### `GET /v1/leaderboard/score`
**Request:**
```
Query Parameters:
- userId: string (optional)
- limit: number (optional, default: 10)
```

**Response:**
```json
{
  "leaderboard": [
    {
      "userId": "uuid",
      "totalScore": 1000.0,
      "rank": 1,
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "userRank": 5
}
```

#### `GET /v1/leaderboard/streak`
**Request:**
```
Query Parameters:
- userId: string (optional)
- limit: number (optional, default: 10)
```

**Response:**
```json
{
  "leaderboard": [
    {
      "userId": "uuid",
      "maxStreak": 20,
      "rank": 1,
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "userRank": 3
}
```

---

## 4. Adaptive Algorithm

### 4.1 Algorithm Pseudocode

```
function updateDifficulty(state, isCorrect, config):
  currentDifficulty = state.currentDifficulty
  confidenceScore = state.confidenceScore
  streak = state.streak
  
  if isCorrect:
    // Increase confidence
    newConfidence = min(1.0, confidenceScore + 0.15)
    
    // Check conditions for difficulty increase
    if (newConfidence >= config.confidenceThreshold AND
        streak >= config.minStreakForIncrease AND
        currentDifficulty < config.maxDifficulty):
      
      increaseThreshold = config.confidenceThreshold + config.hysteresisBand
      if newConfidence >= increaseThreshold:
        currentDifficulty = min(config.maxDifficulty, 
                               currentDifficulty + config.difficultyStep)
        newConfidence = config.confidenceThreshold  // Reset after increase
    
  else:
    // Decrease confidence
    newConfidence = max(0, confidenceScore - config.confidenceDecayRate)
    
    // Check conditions for difficulty decrease
    decreaseThreshold = config.confidenceThreshold - config.hysteresisBand
    if (newConfidence < decreaseThreshold AND
        currentDifficulty > config.minDifficulty):
      currentDifficulty = max(config.minDifficulty,
                             currentDifficulty - config.difficultyStep)
      newConfidence = 0.5  // Reset after decrease
  
  return { newDifficulty: currentDifficulty, newConfidence: newConfidence }
```

### 4.2 Ping-Pong Prevention Mechanisms

1. **Confidence Score (Momentum)**: Tracks recent performance trend (0-1 scale)
2. **Hysteresis Band**: Requires confidence to exceed threshold + buffer before increasing
3. **Minimum Streak Requirement**: Requires at least 2 correct answers before increasing difficulty
4. **Confidence Reset**: Resets confidence after difficulty change to prevent rapid oscillation

### 4.3 Score Calculation Pseudocode

```
function calculateScore(difficulty, isCorrect, streak, config):
  if not isCorrect:
    return 0
  
  baseScore = difficulty * 10  // 10-100 points based on difficulty
  streakMultiplier = min(1 + (streak * 0.1), 3.0)  // Capped at 3x
  score = baseScore * streakMultiplier
  
  return round(score, 2)
```

---

## 5. Caching Strategy

### 5.1 Cache Keys

| Key Pattern | TTL | Description |
|------------|-----|------------|
| `user:state:{userId}` | 3600s | User state cache |
| `questions:difficulty:{difficulty}` | 86400s | Question pool per difficulty |
| `leaderboard:score:{limit}` | 10s | Score leaderboard |
| `leaderboard:streak:{limit}` | 10s | Streak leaderboard |
| `user:metrics:{userId}` | 60s | User metrics |

### 5.2 Cache Invalidation

- **User State**: Invalidated on answer submission
- **Question Pools**: Invalidated when new questions added (24h TTL sufficient)
- **Leaderboards**: Short TTL (10s) for real-time updates, invalidated on score/streak changes
- **Metrics**: Invalidated on answer submission

### 5.3 Real-Time Guarantees

- Leaderboards use short TTL (10s) + cache invalidation on updates
- User state always fetched fresh after answer submission
- Frontend polls every 5-10 seconds for updates

---

## 6. Class/Module Responsibilities

### 6.1 Backend Modules

#### `services/adaptiveAlgorithm.ts`
- **Responsibility**: Core adaptive difficulty algorithm
- **Exports**: `updateDifficulty()`, `calculateScore()`, `getNextDifficulty()`
- **Dependencies**: None

#### `services/userService.ts`
- **Responsibility**: User state management, CRUD operations
- **Exports**: `getUserState()`, `updateUserState()`
- **Dependencies**: `db`, `redis`, `adaptiveAlgorithm`

#### `services/questionService.ts`
- **Responsibility**: Question retrieval and answer verification
- **Exports**: `getQuestionByDifficulty()`, `verifyAnswer()`, `hashAnswer()`
- **Dependencies**: `db`, `redis`

#### `routes/quiz.ts`
- **Responsibility**: Quiz API endpoints (`/next`, `/answer`)
- **Dependencies**: `userService`, `questionService`

#### `routes/leaderboard.ts`
- **Responsibility**: Leaderboard API endpoints
- **Dependencies**: `db`, `redis`

#### `routes/metrics.ts`
- **Responsibility**: Metrics API endpoint
- **Dependencies**: `userService`, `db`, `redis`

### 6.2 Frontend Modules

#### `components/QuizContainer.tsx`
- **Responsibility**: Main quiz flow orchestration
- **State**: Current question, loading, submission state

#### `components/QuestionCard.tsx`
- **Responsibility**: Question display and answer selection UI
- **Props**: Question data, answer handler, disabled state

#### `components/Leaderboard.tsx`
- **Responsibility**: Leaderboard display (score/streak tabs)
- **State**: Leaderboard data, active tab, user rank

#### `components/Metrics.tsx`
- **Responsibility**: User metrics display
- **State**: Metrics data

#### `lib/api.ts`
- **Responsibility**: API client functions
- **Exports**: All API call functions

---

## 7. Edge Cases Handling

### 7.1 Adaptive Algorithm Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Ping-pong oscillation** | Hysteresis band + confidence score prevents rapid flipping |
| **Boundary conditions** | Difficulty clamped to [1, 10], confidence to [0, 1] |
| **First question** | Default difficulty 5, confidence 0.5 |
| **Consecutive wrong answers** | Confidence decays, difficulty decreases gradually |
| **Perfect streak** | Streak multiplier capped at 3x |

### 7.2 Scoring Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Wrong answer** | Score delta = 0 |
| **Duplicate submission** | Idempotency key prevents double scoring |
| **State version mismatch** | Optimistic locking prevents race conditions |
| **Negative scores** | Score cannot go negative (starts at 0) |

### 7.3 System Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **No questions for difficulty** | Returns 404, frontend handles gracefully |
| **Database connection loss** | Connection pooling with retries |
| **Redis cache miss** | Falls back to database |
| **Concurrent answer submissions** | Idempotency key + state version locking |
| **Streak reset on wrong answer** | Immediate reset to 0 |
| **Streak decay after inactivity** | Not implemented (can be added with TTL) |

---

## 8. Leaderboard Update Strategy

### 8.1 Update Flow

1. **On Answer Submission**:
   - Update `user_state` table
   - Insert/update `leaderboard_score` table
   - Insert/update `leaderboard_streak` table
   - Invalidate Redis cache for leaderboards

2. **On Leaderboard Read**:
   - Check Redis cache first
   - If miss, query database with `ORDER BY` and `LIMIT`
   - Cache result with 10s TTL
   - Calculate user rank separately if needed

### 8.2 Real-Time Updates

- Frontend polls leaderboards every 5 seconds
- Cache TTL of 10 seconds ensures freshness
- Cache invalidation on updates ensures immediate consistency

---

## 9. Performance Optimizations

1. **Database Indexes**: All foreign keys and frequently queried columns indexed
2. **Connection Pooling**: PostgreSQL connection pool (max 20 connections)
3. **Redis Caching**: Frequently accessed data cached
4. **Frontend Code Splitting**: Next.js automatic code splitting
5. **Lazy Loading**: Dynamic imports for non-critical components
6. **Memoization**: React memo for expensive components
7. **Rate Limiting**: Prevents abuse (100 req/min per IP)

---

## 10. Security Considerations

1. **Answer Hashing**: Correct answers stored as SHA-256 hashes
2. **Idempotency**: Prevents duplicate answer submissions
3. **Rate Limiting**: Prevents API abuse
4. **Input Validation**: All inputs validated and sanitized
5. **SQL Injection Prevention**: Parameterized queries
6. **CORS**: Configured for frontend origin only

---

## 11. Deployment & Operations

### 11.1 Docker Setup
- Multi-stage builds for optimization
- Health checks for all services
- Volume mounts for data persistence
- Environment variables for configuration

### 11.2 Single Command Startup
```bash
docker-compose up --build
```

### 11.3 Monitoring
- Health check endpoint: `GET /health`
- Database connection monitoring
- Redis connection monitoring

---

## 12. Future Enhancements

1. **WebSocket Support**: Real-time updates without polling
2. **Streak Decay**: Implement inactivity-based streak decay
3. **Question Categories**: Support multiple question categories/tags
4. **User Authentication**: JWT-based authentication
5. **Analytics Dashboard**: Admin dashboard for question performance
6. **A/B Testing**: Test different adaptive algorithms
