# Multi-stage production Dockerfile for Strapi API
# Build context: monorepo root (use -f packages/api/Dockerfile .)

# Stage 1: Builder
FROM node:22-alpine AS builder
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git python3 make g++ > /dev/null 2>&1

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/api/package.json ./packages/api/

# Copy API source code
COPY packages/api ./packages/api

WORKDIR /app/packages/api

# Install dependencies
RUN npm install

# Add node_modules/.bin to PATH for strapi CLI
ENV PATH=/app/packages/api/node_modules/.bin:$PATH

# Build Strapi admin panel
ENV NODE_ENV=production
ARG STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
ENV STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN=${STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN}
RUN npm run build

# Stage 2: Production runtime
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
