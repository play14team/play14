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
  /**
   * Number of trusted proxies in front of the application.
   * When set, only the Nth IP from the right in X-Forwarded-For is trusted.
   * Set to 0 to ignore X-Forwarded-For entirely (direct connections only).
   * Set to 1 for a single proxy (e.g., Nginx, Clever Cloud edge).
   * Default: 1 (assumes one reverse proxy)
   */
  trustProxy?: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const defaultConfig: RateLimitConfig = {
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many requests, please try again later.",
  trustProxy: 1, // Default: trust one proxy (typical deployment behind reverse proxy)
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
 * Get client IP from request, handling proxies securely.
 *
 * SECURITY: X-Forwarded-For can be spoofed by clients. We use trustProxy
 * to only trust IPs added by our known reverse proxies.
 *
 * With trustProxy=1 and X-Forwarded-For: "spoofed, real-client, proxy":
 * - We take the 1st IP from the RIGHT (added by our proxy) = "proxy"
 * - Actually we want the IP the proxy saw, which is real-client
 * - So with trustProxy=N, we take the (N+1)th IP from the right
 *
 * @param ctx - Koa context
 * @param trustProxy - Number of trusted proxies (0 = ignore X-Forwarded-For)
 */
function getClientIp(ctx: any, trustProxy: number): string {
  // If trustProxy is 0, ignore X-Forwarded-For entirely (direct connection only)
  if (trustProxy === 0) {
    return ctx.request.ip || ctx.ip || "unknown"
  }

  const forwarded = ctx.request.headers["x-forwarded-for"]
  if (forwarded && typeof forwarded === "string") {
    const ips = forwarded.split(",").map((ip) => ip.trim())

    // With N trusted proxies, the client IP is at position (length - N - 1)
    // Example: trustProxy=1, ips=["spoofed", "real", "proxy"]
    // We want "real" which is at index 1 = 3 - 1 - 1
    const clientIndex = ips.length - trustProxy - 1

    if (clientIndex >= 0 && ips[clientIndex]) {
      return ips[clientIndex]
    }

    // If there aren't enough IPs for the trust level, fall back to direct IP
    // This prevents spoofing when fewer proxies than expected
    return ctx.request.ip || ctx.ip || "unknown"
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
    const key = finalConfig.keyGenerator
      ? finalConfig.keyGenerator(ctx)
      : getClientIp(ctx, finalConfig.trustProxy ?? 1)
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
