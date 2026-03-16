FROM node:20-slim AS builder

WORKDIR /app

# Install git (needed for simple-git)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY tsconfig.json vitest.config.ts ./
COPY src/ src/

# Build
RUN npm run build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create workspace directory
RUN mkdir -p /data/workspaces

ENV WORKSPACE_ROOT=/data/workspaces
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
