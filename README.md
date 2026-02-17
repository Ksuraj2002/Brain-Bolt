# BrainBolt - Adaptive Infinite Quiz Platform

An adaptive infinite quiz platform that serves one question at a time with dynamic difficulty adjustment based on user performance.

## Features

- **Adaptive Difficulty**: Automatically adjusts question difficulty based on correct/incorrect answers
- **Streak System**: Tracks streaks with multipliers that affect scoring (capped at 3x)
- **Live Leaderboards**: Real-time rankings for total score and current streak
- **Real-time Updates**: Instant updates for scores, streaks, and leaderboards via polling
- **Ping-pong Prevention**: Stabilization algorithm prevents rapid difficulty oscillation using:
  - Confidence score (momentum-based)
  - Hysteresis band (buffer before changing difficulty)
  - Minimum streak requirement for difficulty increase
- **Idempotent API**: Prevents duplicate answer submissions
- **Rate Limiting**: Protects against API abuse
- **Dark Mode**: Light/dark theme support
- **Responsive Design**: Works on all device sizes

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose

### Run with Docker (Recommended - Single Command)

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Or directly:**
```bash
docker-compose up --build
```

This single command will:
- Build and start PostgreSQL database
- Build and start Redis cache
- Build and start Backend API (with auto-migration and seeding)
- Build and start Frontend application

The application will be available at:
- **Frontend**: http://localhost:5001
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health


## Project Structure

```
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # API client and utilities
│   │   └── hooks/        # Custom React hooks
│   ├── Dockerfile
│   └── package.json
├── backend/               # Express API backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── migrations/   # Database seeding
│   │   ├── db.ts         # Database connection
│   │   └── index.ts      # Server entry point
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml     # Docker orchestration
├── LLD.md                 # Low-Level Design document
├── EDGE_CASES.md          # Edge case documentation
├── start.sh               # Linux/Mac startup script
├── start.bat              # Windows startup script
└── README.md              # This file
```

## API Endpoints

### Quiz Endpoints

- `GET /v1/quiz/next?userId={userId}&sessionId={sessionId}` - Get next question
- `POST /v1/quiz/answer` - Submit answer
  ```json
  {
    "userId": "uuid",
    "sessionId": "uuid",
    "questionId": "uuid",
    "answer": "user answer",
    "stateVersion": 1,
    "answerIdempotencyKey": "optional-key"
  }
  ```
- `GET /v1/quiz/metrics?userId={userId}` - Get user metrics

### Leaderboard Endpoints

- `GET /v1/leaderboard/score?userId={userId}&limit={limit}` - Get score leaderboard
- `GET /v1/leaderboard/streak?userId={userId}&limit={limit}` - Get streak leaderboard

### Health Check

- `GET /health` - Check system health (database and Redis connections)

## Adaptive Algorithm

The adaptive algorithm prevents ping-pong instability using:

1. **Confidence Score**: Tracks performance momentum (0-1 scale)
2. **Hysteresis Band**: Requires confidence to exceed threshold + buffer before increasing difficulty
3. **Minimum Streak**: Requires at least 2 correct answers before increasing difficulty
4. **Confidence Reset**: Resets confidence after difficulty change

See `LLD.md` for detailed algorithm pseudocode.

## Scoring System

- **Base Score**: Difficulty × 10 (10-100 points)
- **Streak Multiplier**: 1 + (streak × 0.1), capped at 3x
- **Final Score**: Base Score × Streak Multiplier
- **Wrong Answers**: Score delta = 0 (no negative scores)

## Edge Cases Handled

See `EDGE_CASES.md` for comprehensive documentation of all edge cases, including:
- Ping-pong instability prevention
- Duplicate answer submission (idempotency)
- Race conditions (optimistic locking)
- Boundary conditions
- Network errors
- Cache failures

## Design System

The frontend uses a design system with tokens for:
- Colors (primary palette)
- Spacing (xs, sm, md, lg, xl, 2xl)
- Border radius (sm, md, lg, xl, 2xl)
- Shadows (soft, medium, large)
- Typography (Inter font family)

All components are composable, accessible, and scalable.

## Performance Optimizations

- Database indexes on frequently queried columns
- Redis caching for user state, question pools, and leaderboards
- Connection pooling (PostgreSQL)
- Frontend code splitting and lazy loading
- React memoization for expensive components
- Rate limiting (100 req/min per IP)

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses tsx watch mode
```

### Frontend Development
```bash
cd frontend
npm run dev  # Next.js dev server
```

### Database Migrations
The database schema is automatically initialized on backend startup. To manually seed:
```bash
cd backend
npm run seed
```

## Testing

Health check endpoint can be used to verify system status:
```bash
curl http://localhost:4000/health
```

## Documentation

- **LLD.md**: Low-Level Design document with architecture, schemas, and algorithms
- **EDGE_CASES.md**: Comprehensive edge case documentation


## Notes

- User IDs are auto-generated and stored in localStorage
- Questions are seeded automatically on first startup
- Leaderboards update in real-time via polling (5-10 second intervals)
- All API endpoints are idempotent where applicable
- System is stateless (except database and cache)
