# Multi-stage production Dockerfile for Next.js 16 standalone output
# Build context: monorepo root (use -f packages/web/Dockerfile .)
# Optimized for minimal image size and security

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
FROM oven/bun:1.3.5-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy web package source
COPY packages/web ./packages/web

WORKDIR /app/packages/web

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for runtime configuration
ARG STRAPI_API_URL
ARG STRAPI_API_SECRET
ARG NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
ARG NEXT_PUBLIC_WEB_VITALS

# Set build-time environment variables
ENV STRAPI_API_URL=${STRAPI_API_URL}
ENV STRAPI_API_SECRET=${STRAPI_API_SECRET}
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=${NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
ENV NEXT_PUBLIC_WEB_VITALS=${NEXT_PUBLIC_WEB_VITALS}

# Build application
RUN bun run build

# Stage 3: Runner (bun-only)
FROM oven/bun:1.3.5-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Health check using bun
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "const http = require('http'); http.get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application with bun
CMD ["bun", "packages/web/server.js"]
