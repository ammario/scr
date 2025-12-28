# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN npm install

# Copy source
COPY . .

# Build Next.js (standalone mode)
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only necessary files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]