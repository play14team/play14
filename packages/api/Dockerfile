# Multi-stage production Dockerfile for Strapi API
# Build context: monorepo root (use -f packages/api/Dockerfile .)

# Stage 1: Dependencies - only rebuilds when package files change
FROM oven/bun:1.3.5-alpine AS deps
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1

WORKDIR /app

# Copy only package files first for optimal caching
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/

# Install production dependencies
ENV NODE_ENV=production
RUN bun install --production --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1.3.5-alpine AS builder
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1

WORKDIR /app

# Copy dependencies from deps stage (cached layer)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy source code (only invalidates this layer on source changes)
COPY packages/api ./packages/api

WORKDIR /app/packages/api

# Build Strapi admin panel
ENV NODE_ENV=production
ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}
RUN bun run build

# Stage 3: Production runtime
FROM oven/bun:1.3.5-alpine AS runner

RUN apk add --no-cache vips-dev

ENV NODE_ENV=production
ENV TZ=UTC

ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api ./packages/api
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/packages/api

ENV PATH=/app/node_modules/.bin:$PATH

RUN chown -R bun:bun /app
USER bun

EXPOSE 1337

CMD ["strapi", "start"]
