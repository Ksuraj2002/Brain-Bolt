FROM node:18-alpine AS base

WORKDIR /app

# Stage 1: Install all dependencies (including devDependencies for building)
FROM base AS deps
COPY package*.json ./
# Use npm install (works with or without package-lock.json)
RUN npm install --legacy-peer-deps

# Stage 2: Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production - install only production dependencies
FROM base AS runner
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

# Copy built files
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["npm", "start"]