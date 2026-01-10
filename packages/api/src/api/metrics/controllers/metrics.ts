/**
 * Prometheus metrics endpoint controller
 *
 * Exposes metrics in Prometheus format for scraping.
 * Access is restricted to internal networks in production.
 */

import type { Core } from "@strapi/strapi"
import {
  getMetrics,
  getContentType,
} from "../../../services/observability/metrics"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /api/metrics
   * Returns metrics in Prometheus format
   */
  async index(ctx: any) {
    // Security: In production, only allow internal requests or token auth
    if (process.env.NODE_ENV === "production") {
      const ip = getClientIp(ctx)
      const metricsToken = ctx.request.headers["x-metrics-token"]
      const expectedToken = process.env.METRICS_TOKEN

      const isInternal =
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("10.") ||
        ip.startsWith("172.16.") ||
        ip.startsWith("172.17.") ||
        ip.startsWith("172.18.") ||
        ip.startsWith("172.19.") ||
        ip.startsWith("172.2") ||
        ip.startsWith("172.3") ||
        ip.startsWith("192.168.")

      // Allow if internal OR if valid token provided
      if (!isInternal && (!expectedToken || metricsToken !== expectedToken)) {
        strapi.log.warn(
          `[Metrics] Unauthorized access attempt from ${ip}`
        )
        ctx.status = 403
        ctx.body = {
          error: {
            status: 403,
            name: "ForbiddenError",
            message: "Metrics endpoint is internal only",
          },
        }
        return
      }
    }

    try {
      const metrics = await getMetrics()
      ctx.set("Content-Type", getContentType())
      ctx.body = metrics
    } catch (error) {
      strapi.log.error(`[Metrics] Failed to collect metrics: ${error}`)
      ctx.status = 500
      ctx.body = {
        error: {
          status: 500,
          name: "InternalServerError",
          message: "Failed to collect metrics",
        },
      }
    }
  },
})

/**
 * Get client IP from request, handling proxies
 */
function getClientIp(ctx: any): string {
  const forwarded = ctx.request.headers["x-forwarded-for"]
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(",")[0].trim()
  }
  return ctx.request.ip || ctx.ip || "unknown"
}
