# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Install all dependencies (need devDeps for build)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# Production stage - install only prod deps
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install prod deps only
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy built assets and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/lib ./lib

CMD ["bun", "run", "src/server/index.ts"]
