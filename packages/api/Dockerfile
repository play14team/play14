# Multi-stage production Dockerfile for Strapi API
# Build context: monorepo root (use -f packages/api/Dockerfile .)

# Stage 1: Build
FROM oven/bun:1.3.5-alpine AS build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1

ENV NODE_ENV=production

ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}

WORKDIR /app

# Copy workspace root files for bun workspace resolution
COPY package.json bun.lock ./

# Copy the api package
COPY packages/api ./packages/api

# Install dependencies using workspace resolution
RUN bun install --production --frozen-lockfile

# Build Strapi admin panel
WORKDIR /app/packages/api
RUN bun run build

# Stage 2: Production runtime
FROM oven/bun:1.3.5-alpine AS runner

RUN apk add --no-cache vips-dev

ENV NODE_ENV=production
ENV TZ=UTC

ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}

WORKDIR /app

# Copy built application and dependencies
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/api ./packages/api
COPY --from=build /app/package.json ./package.json

WORKDIR /app/packages/api

ENV PATH=/app/node_modules/.bin:$PATH

RUN chown -R bun:bun /app
USER bun

EXPOSE 1337

CMD ["strapi", "start"]
