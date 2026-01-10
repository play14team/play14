/**
 * Rate limiting middleware for Strapi 5
 *
 * Provides configurable rate limiting based on IP address.
 * Uses in-memory storage with sliding window algorithm.
 */

import type { Core } from "@strapi/strapi"

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number
  /** Time window in milliseconds */
  windowMs: number
  /** Message returned when rate limit exceeded */
  message?: string
  /** Skip rate limiting for these paths (regex patterns) */
  skipPaths?: string[]
  /** Only apply to these paths (regex patterns) - if set, overrides skipPaths */
  onlyPaths?: string[]
  /** Custom key generator (default: IP address) */
  keyGenerator?: (ctx: any) => string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const defaultConfig: RateLimitConfig = {
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many requests, please try again later.",
}

// In-memory store for rate limit data
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  },
  5 * 60 * 1000
)

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

/**
 * Check if path matches any pattern in the list
 */
function matchesPath(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern)
    return regex.test(path)
  })
}

export default (config: Partial<RateLimitConfig>, { strapi }: { strapi: Core.Strapi }) => {
  const finalConfig = { ...defaultConfig, ...config }

  return async (ctx: any, next: () => Promise<void>) => {
    const path = ctx.request.path

    // Check if path should be skipped
    if (finalConfig.onlyPaths) {
      if (!matchesPath(path, finalConfig.onlyPaths)) {
        return next()
      }
    } else if (finalConfig.skipPaths && matchesPath(path, finalConfig.skipPaths)) {
      return next()
    }

    // Generate rate limit key
    const key = finalConfig.keyGenerator ? finalConfig.keyGenerator(ctx) : getClientIp(ctx)
    const storeKey = `${key}:${path}`

    const now = Date.now()
    let entry = rateLimitStore.get(storeKey)

    // Initialize or reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + finalConfig.windowMs,
      }
    }

    entry.count++
    rateLimitStore.set(storeKey, entry)

    // Set rate limit headers
    const remaining = Math.max(0, finalConfig.max - entry.count)
    const reset = Math.ceil(entry.resetAt / 1000)

    ctx.set("X-RateLimit-Limit", String(finalConfig.max))
    ctx.set("X-RateLimit-Remaining", String(remaining))
    ctx.set("X-RateLimit-Reset", String(reset))

    // Check if rate limit exceeded
    if (entry.count > finalConfig.max) {
      strapi.log.warn(`[RateLimit] Rate limit exceeded for ${key} on ${path}`)

      ctx.status = 429
      ctx.body = {
        error: {
          status: 429,
          name: "TooManyRequestsError",
          message: finalConfig.message,
        },
      }
      ctx.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)))
      return
    }

    await next()
  }
}
