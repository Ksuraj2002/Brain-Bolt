# Edge Cases Documentation
## BrainBolt - Adaptive Infinite Quiz Platform

This document explicitly lists all edge cases handled in the adaptive quiz system.

---

## 1. Adaptive Algorithm Edge Cases

### 1.1 Ping-Pong Instability
**Problem**: Rapid oscillation between two difficulty levels (e.g., correct/wrong alternation causes difficulty to flip between 5 and 6 forever).

**Solution**: 
- **Confidence Score**: Tracks momentum (0-1 scale), requires sustained performance
- **Hysteresis Band**: Requires confidence to exceed threshold + 0.3 buffer before increasing difficulty
- **Minimum Streak**: Requires at least 2 correct answers before increasing difficulty
- **Confidence Reset**: Resets confidence after difficulty change to prevent rapid escalation

**Implementation**: `services/adaptiveAlgorithm.ts`

### 1.2 Boundary Conditions
**Problem**: Difficulty or confidence values going out of bounds.

**Solution**:
- Difficulty clamped to [1, 10] using `Math.min()` and `Math.max()`
- Confidence score clamped to [0, 1]
- All boundary checks enforced at database level with CHECK constraints

**Implementation**: `services/adaptiveAlgorithm.ts`, `db.ts` (schema)

### 1.3 First Question
**Problem**: No user state exists for new users.

**Solution**:
- Default difficulty: 5 (middle of range)
- Default confidence: 0.5 (neutral)
- Default streak: 0
- User state created automatically on first question request

**Implementation**: `services/userService.ts::getUserState()`

### 1.4 Consecutive Wrong Answers
**Problem**: User keeps getting questions wrong, difficulty should decrease gradually.

**Solution**:
- Confidence decays by 0.1 per wrong answer
- Difficulty decreases only when confidence drops below threshold - hysteresis band
- Prevents sudden difficulty drops

**Implementation**: `services/adaptiveAlgorithm.ts::updateDifficulty()`

### 1.5 Perfect Streak
**Problem**: Streak multiplier could become unbounded.

**Solution**:
- Streak multiplier capped at 3x: `Math.min(1 + (streak * 0.1), 3.0)`
- Prevents excessive score inflation

**Implementation**: `services/adaptiveAlgorithm.ts::calculateScore()`

---

## 2. Scoring Edge Cases

### 2.1 Wrong Answer Scoring
**Problem**: Should wrong answers give negative scores?

**Solution**:
- Wrong answers return score delta of 0
- Total score never decreases (starts at 0, only increases)
- Prevents negative scores

**Implementation**: `services/adaptiveAlgorithm.ts::calculateScore()`

### 2.2 Duplicate Answer Submission
**Problem**: Same answer submitted multiple times (network retry, double-click).

**Solution**:
- **Idempotency Key**: Unique key per answer submission (`userId-questionId-timestamp`)
- Database constraint: `idempotency_key TEXT UNIQUE`
- Returns existing result if key already exists
- Prevents double scoring

**Implementation**: `services/userService.ts::updateUserState()`, `routes/quiz.ts`

### 2.3 State Version Mismatch (Race Condition)
**Problem**: Concurrent answer submissions could cause inconsistent state.

**Solution**:
- **Optimistic Locking**: `state_version` field incremented on each update
- Update query includes `WHERE state_version = $current_version`
- If version mismatch, update fails (prevents lost updates)
- Frontend receives new state version after each answer

**Implementation**: `services/userService.ts::updateUserState()`

### 2.4 Score Overflow
**Problem**: Very large scores could overflow database field.

**Solution**:
- Database field: `DECIMAL(15, 2)` - supports up to 999,999,999,999,999.99
- Score calculation uses decimal arithmetic
- Rounded to 2 decimal places

**Implementation**: Database schema, `services/adaptiveAlgorithm.ts`

---

## 3. System Edge Cases

### 3.1 No Questions Available
**Problem**: No questions exist for requested difficulty level.

**Solution**:
- Returns 404 error with message "No questions available for this difficulty"
- Frontend handles gracefully with user-friendly message
- Logs warning for monitoring

**Implementation**: `services/questionService.ts::getQuestionByDifficulty()`, `routes/quiz.ts`

### 3.2 Database Connection Loss
**Problem**: Database becomes unavailable during operation.

**Solution**:
- Connection pooling with retry logic
- Health check endpoint monitors database status
- Graceful error handling with user-friendly messages
- Docker health checks restart container on failure

**Implementation**: `db.ts`, `index.ts` (health check)

### 3.3 Redis Cache Miss
**Problem**: Redis unavailable or cache miss.

**Solution**:
- All cache operations wrapped in try-catch
- Falls back to database on cache miss
- Cache is optimization, not requirement
- System continues to function without Redis

**Implementation**: All service files with Redis usage

### 3.4 Concurrent Answer Submissions
**Problem**: User submits same answer multiple times simultaneously.

**Solution**:
- Idempotency key prevents duplicate processing
- Database unique constraint on `idempotency_key`
- Returns existing result immediately if duplicate detected

**Implementation**: `services/userService.ts::updateUserState()`

### 3.5 Streak Reset on Wrong Answer
**Problem**: Streak should reset to 0 immediately on wrong answer.

**Solution**:
- Streak set to 0 immediately when `isCorrect = false`
- No delay or gradual decay
- Max streak preserved (never decreases)

**Implementation**: `services/userService.ts::updateUserState()`

### 3.6 Streak Decay After Inactivity
**Problem**: Should streaks decay if user is inactive?

**Current Implementation**: 
- **Not implemented** - streaks persist indefinitely
- Can be added with TTL-based cleanup job

**Future Enhancement**: 
- Add `last_activity_at` timestamp
- Background job resets streaks after X hours of inactivity
- Or implement streak decay on next question load

---

## 4. Leaderboard Edge Cases

### 4.1 Empty Leaderboard
**Problem**: No users have scores yet.

**Solution**:
- Returns empty array `[]`
- Frontend displays "No rankings yet" message
- User rank shows as null

**Implementation**: `routes/leaderboard.ts`

### 4.2 User Not in Top N
**Problem**: User's rank is outside top N displayed.

**Solution**:
- Separate query calculates user's rank
- Displayed below top N list if not in top N
- Shows "Your rank: #X" with user's data

**Implementation**: `routes/leaderboard.ts`, `components/Leaderboard.tsx`

### 4.3 Tied Scores/Streaks
**Problem**: Multiple users have same score or streak.

**Solution**:
- Database `ROW_NUMBER()` assigns sequential ranks
- Ties broken by `updated_at` timestamp (implicit)
- Users with same score get different ranks (1, 2, 3...)
- For true tie-breaking, could add secondary sort by `user_id`

**Implementation**: `routes/leaderboard.ts`

### 4.4 Leaderboard Staleness
**Problem**: Leaderboard cache might show stale data.

**Solution**:
- Short TTL (10 seconds) ensures freshness
- Cache invalidated immediately on score/streak updates
- Frontend polls every 5 seconds for updates

**Implementation**: `routes/leaderboard.ts`, `components/Leaderboard.tsx`

---

## 5. Question Selection Edge Cases

### 5.1 Same Question Repeated
**Problem**: User gets same question multiple times.

**Solution**:
- `excludeQuestionIds` parameter filters out recent questions
- Last question ID stored in `user_state.last_question_id`
- Excluded from next question selection
- If all questions exhausted, returns null (handled gracefully)

**Implementation**: `services/questionService.ts::getQuestionByDifficulty()`

### 5.2 Question Pool Exhaustion
**Problem**: All questions for difficulty level already shown.

**Solution**:
- If no questions available after filtering, returns null
- API returns 404 error
- Frontend displays "No questions available" message
- Could implement question pool reset after all shown

**Implementation**: `services/questionService.ts::getQuestionByDifficulty()`

---

## 6. API Edge Cases

### 6.1 Missing Required Parameters
**Problem**: API called without required parameters.

**Solution**:
- Input validation on all endpoints
- Returns 400 Bad Request with error message
- Clear error messages guide developers

**Implementation**: All route handlers

### 6.2 Invalid Question ID
**Problem**: Answer submitted for non-existent question.

**Solution**:
- Database query checks question existence
- Returns 404 if question not found
- Prevents invalid answer processing

**Implementation**: `routes/quiz.ts::POST /answer`

### 6.3 Rate Limiting
**Problem**: API abuse or excessive requests.

**Solution**:
- Express rate limiter: 100 requests per minute per IP
- Returns 429 Too Many Requests when exceeded
- Prevents abuse and DoS attacks

**Implementation**: `middleware/rateLimiter.ts`

---

## 7. Frontend Edge Cases

### 7.1 Network Errors
**Problem**: API calls fail due to network issues.

**Solution**:
- Try-catch blocks around all API calls
- Error messages displayed to user
- Retry logic for transient failures
- Graceful degradation

**Implementation**: `lib/api.ts`, all components

### 7.2 Loading States
**Problem**: User sees blank screen during data loading.

**Solution**:
- Loading skeletons for all async operations
- Spinner indicators during submission
- Optimistic UI updates where possible

**Implementation**: All components with async operations

### 7.3 Browser Refresh
**Problem**: User state lost on page refresh.

**Solution**:
- User ID stored in localStorage
- Persists across sessions
- State fetched from server on load

**Implementation**: `app/page.tsx`

---

## 8. Data Consistency Edge Cases

### 8.1 Transaction Failures
**Problem**: Partial updates if database transaction fails.

**Solution**:
- All state updates wrapped in database transactions
- `BEGIN` / `COMMIT` / `ROLLBACK` ensures atomicity
- If any step fails, entire update rolls back

**Implementation**: `services/userService.ts::updateUserState()`

### 8.2 Cache-Database Inconsistency
**Problem**: Cache shows stale data after database update.

**Solution**:
- Cache invalidated immediately after database updates
- Short TTLs for frequently updated data (leaderboards)
- Cache-aside pattern: always check cache, fallback to DB

**Implementation**: All service files

---

## Summary

All critical edge cases are handled with:
1. **Defensive Programming**: Input validation, boundary checks
2. **Idempotency**: Prevents duplicate operations
3. **Optimistic Locking**: Prevents race conditions
4. **Graceful Degradation**: System continues functioning with partial failures
5. **Clear Error Messages**: Users and developers understand issues
6. **Monitoring**: Health checks and logging for operational visibility
