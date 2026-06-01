FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# ── Development image ─────────────────────────────────────────────────────────
FROM base AS development
EXPOSE 4000
CMD ["npx", "nodemon", "--exec", "ts-node", "src/index.ts"]

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS builder
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
