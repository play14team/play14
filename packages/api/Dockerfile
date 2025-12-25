# Multi-stage production Dockerfile for Strapi API
# Build context: monorepo root (use -f packages/api/Dockerfile .)
# Uses bun for dependency installation, node for Strapi build/runtime

# Stage 1: Dependencies
FROM oven/bun:1.3.5-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy ALL workspace package.json files (bun workspaces require all to exist)
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/design/package.json ./packages/design/

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git python3 make g++ > /dev/null 2>&1

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock

# Copy ALL workspace package.json files for workspace resolution
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/design/package.json ./packages/design/

# Copy API source code
COPY packages/api ./packages/api

# Rebuild native modules for Node.js (bun may have compiled them differently)
RUN npm rebuild

# Add node_modules/.bin to PATH for strapi CLI
ENV PATH=/app/node_modules/.bin:$PATH

WORKDIR /app/packages/api

# Build Strapi admin panel
ENV NODE_ENV=production
ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}
RUN npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runner

RUN apk add --no-cache vips-dev

ENV NODE_ENV=production
ENV TZ=UTC

ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}

WORKDIR /app

# Copy rebuilt dependencies (with native modules compiled for Node.js) and built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api ./packages/api

# Add node_modules/.bin to PATH for strapi CLI
ENV PATH=/app/node_modules/.bin:$PATH

WORKDIR /app/packages/api

RUN chown -R node:node /app
USER node

EXPOSE 1337

CMD ["npm", "run", "start"]
