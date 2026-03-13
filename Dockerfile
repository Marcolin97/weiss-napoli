# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build


# ─── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies (needed because @libsql/client is
# marked as nitro external and resolved at runtime from node_modules)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built Nuxt output from builder
COPY --from=builder /app/.output ./.output

# Ensure the data directory exists (will be overridden by a mounted volume)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
