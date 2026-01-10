/**
 * Prometheus metrics middleware for Strapi 5
 *
 * Records HTTP request duration and counts for Prometheus monitoring.
 * Should be placed early in the middleware stack for accurate timing.
 */

import type { Core } from "@strapi/strapi"
import {
  httpRequestDuration,
  httpRequestsTotal,
} from "../services/observability/metrics"

interface MetricsMiddlewareConfig {
  /** Enable/disable the middleware */
  enabled?: boolean
  /** Paths to exclude from metrics */
  excludePaths?: string[]
}

const defaultExcludePaths = [
  "/api/metrics",
  "/_health",
  "/admin",
  "/favicon.ico",
  "/uploads",
]

export default (
  config: MetricsMiddlewareConfig,
  { strapi }: { strapi: Core.Strapi }
) => {
  const enabled = config.enabled !== false
  const excludePaths = config.excludePaths || defaultExcludePaths

  return async (ctx: any, next: () => Promise<void>) => {
    // Skip if disabled
    if (!enabled) {
      return next()
    }

    const path = ctx.request.path

    // Skip excluded paths
    if (excludePaths.some((p) => path.startsWith(p))) {
      return next()
    }

    const start = process.hrtime.bigint()

    await next()

    const end = process.hrtime.bigint()
    const durationSeconds = Number(end - start) / 1e9

    // Normalize route for metrics grouping
    const route = normalizeRoute(path)
    const labels = {
      method: ctx.request.method,
      route,
      status_code: String(ctx.response.status),
    }

    // Record metrics
    httpRequestDuration.observe(labels, durationSeconds)
    httpRequestsTotal.inc(labels)
  }
}

/**
 * Normalize route for grouping in metrics
 * Replaces dynamic segments with placeholders to avoid high cardinality
 */
function normalizeRoute(path: string): string {
  return (
    path
      // Replace UUIDs with :id
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ":id"
      )
      // Replace numeric IDs with :id
      .replace(/\/\d+/g, "/:id")
      // Replace document IDs (alphanumeric, typically 24+ chars)
      .replace(/\/[a-z0-9]{24,}/gi, "/:documentId")
      // Replace slugs after known entity paths
      .replace(
        /(events|players|games|articles|venues)\/[a-z0-9-]+/gi,
        "$1/:slug"
      )
  )
}
