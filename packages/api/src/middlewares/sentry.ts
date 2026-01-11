/**
 * Sentry middleware for Strapi 5
 *
 * Provides request tracing and error capturing for APM.
 * Must be placed after strapi::errors in the middleware stack.
 */

import type { Core } from "@strapi/strapi"
import * as Sentry from "@sentry/node"
import { setUser, clearUser } from "../services/observability/sentry"

interface SentryMiddlewareConfig {
  /** Enable/disable the middleware */
  enabled?: boolean
  /** Paths to exclude from tracing */
  excludePaths?: string[]
}

const defaultExcludePaths = [
  "/api/metrics",
  "/_health",
  "/admin",
  "/favicon.ico",
]

export default (
  config: SentryMiddlewareConfig,
  { strapi }: { strapi: Core.Strapi }
) => {
  const enabled = config.enabled !== false
  const excludePaths = config.excludePaths || defaultExcludePaths

  return async (ctx: any, next: () => Promise<void>) => {
    // Skip if disabled or no DSN configured
    if (!enabled || !process.env.SENTRY_DSN) {
      return next()
    }

    const path = ctx.request.path

    // Skip excluded paths
    if (excludePaths.some((p) => path.startsWith(p))) {
      return next()
    }

    // Start a span for this request
    await Sentry.startSpan(
      {
        name: `${ctx.request.method} ${normalizeRoute(path)}`,
        op: "http.server",
        attributes: {
          "http.method": ctx.request.method,
          "http.url": ctx.request.url,
          "http.route": normalizeRoute(path),
        },
      },
      async (span) => {
        try {
          // Set user context if authenticated
          if (ctx.state?.user) {
            setUser({
              id: String(ctx.state.user.id),
              email: ctx.state.user.email,
              username: ctx.state.user.username,
            })
          }

          await next()

          // Record response status
          span.setAttribute("http.status_code", ctx.response.status)

          // Capture 5xx errors even when handled by strapi::errors middleware
          if (ctx.response.status >= 500) {
            Sentry.captureException(
              new Error(
                `HTTP ${ctx.response.status}: ${ctx.request.method} ${ctx.request.path}`
              ),
              {
                extra: {
                  path: ctx.request.path,
                  method: ctx.request.method,
                  query: ctx.request.query,
                  status: ctx.response.status,
                },
              }
            )
          }

          if (ctx.response.status >= 400) {
            span.setStatus({ code: 2, message: `HTTP ${ctx.response.status}` }) // Error status
          }
        } catch (error) {
          // Capture the exception
          Sentry.captureException(error, {
            extra: {
              path: ctx.request.path,
              method: ctx.request.method,
              query: ctx.request.query,
            },
          })

          span.setStatus({ code: 2, message: "Error" })
          throw error
        } finally {
          // Clear user context after request
          clearUser()
        }
      }
    )
  }
}

/**
 * Normalize route for grouping in Sentry
 * Replaces dynamic segments with placeholders
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
