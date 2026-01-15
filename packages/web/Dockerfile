# Runtime-only Dockerfile for CI pre-built Next.js standalone output
# Build context: packages/web (after running bun run build on CI worker)
#
# IMPORTANT: NEXT_PUBLIC_* environment variables are bundled at build time
# by Next.js during the `bun run build` step in GitHub Actions.
# They are already baked into the .next/standalone output copied into this image.

FROM oven/bun:1.3.5-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the entire standalone output structure
COPY --chown=nextjs:nodejs .next/standalone ./

# Copy static files to the correct nested location
COPY --chown=nextjs:nodejs .next/static ./packages/web/.next/static
COPY --chown=nextjs:nodejs public ./packages/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "const http = require('http'); http.get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Point to the correct server.js location in the monorepo structure
CMD ["bun", "packages/web/server.js"]