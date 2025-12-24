# Multi-stage production Dockerfile for Strapi API
# Build context: monorepo root (use -f packages/api/Dockerfile .)

# Stage 1: Dependencies - use bun for fast dependency installation
FROM oven/bun:1.3.5-alpine AS deps
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git python3 make g++ > /dev/null 2>&1

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy ALL workspace package.json files (bun workspaces require all to exist)
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/design/package.json ./packages/design/

# Install dependencies with bun (fast, cached layer)
RUN bun install --frozen-lockfile

# Stage 2: Builder - use node/npm for Strapi build (full compatibility)
FROM node:22-alpine AS builder
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git python3 make g++ > /dev/null 2>&1

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/api/package.json ./packages/api/

# Copy API source code
COPY packages/api ./packages/api

WORKDIR /app/packages/api

# Install node-addon-api for sharp native build, then install dependencies
RUN npm install -g node-addon-api && npm install

# Add node_modules/.bin to PATH for strapi CLI
ENV PATH=/app/packages/api/node_modules/.bin:$PATH

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

WORKDIR /app/packages/api

# Copy built application and dependencies
COPY --from=builder /app/packages/api ./

# Add node_modules/.bin to PATH for strapi CLI
ENV PATH=/app/packages/api/node_modules/.bin:$PATH

RUN chown -R node:node /app
USER node

EXPOSE 1337

CMD ["npm", "run", "start"]
