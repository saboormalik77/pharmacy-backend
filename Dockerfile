# ---- Stage 1: Build ----
# Use Debian (slim) so canvas compiles; Alpine's toolchain breaks canvas C++ build
FROM node:20-slim AS builder

WORKDIR /app

# Install build deps for native modules (canvas)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript application
RUN npm run build

# Production deps only (so we don't copy devDependencies to final image)
RUN rm -rf node_modules && npm ci --omit=dev

# ---- Stage 2: Production ----
FROM node:20-slim AS production

WORKDIR /app

# Runtime libs for canvas (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy dependency manifests
COPY package.json package-lock.json ./

# Copy built app and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 8080 = unprivileged port safe for non-root USER; set WEBSITES_PORT=8080 in Azure App Service
EXPOSE 8080

# Run as non-root user for security
USER node

# Start the application
CMD ["node", "dist/src/server.js"]
