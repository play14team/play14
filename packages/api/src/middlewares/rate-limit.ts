/**
 * Rate limiting middleware for Strapi 5
 *
 * Provides configurable rate limiting based on IP address.
 *
 * Storage:
 *   - Redis (shared across all containers) when REDIS_URL is configured.
 *   - In-memory fallback otherwise (per-instance, suitable for dev/single-node).
 *
 * The Redis backend uses an atomic INCR + PEXPIRE (on first increment) pattern
 * so counts stay correct even with many concurrent requests. Each rate-limit
 * entry has a bounded TTL so expired buckets are removed by Redis automatically.
 */

import type { Core } from "@strapi/strapi"
import Redis from "ioredis"

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
  /**
   * Prefix for Redis keys (and the internal in-memory map). Lets multiple
   * rate-limit instances (e.g., one for auth, one for ticket-orders) coexist
   * without their counters colliding.
   * Default: "default".
   */
  bucket?: string
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
  bucket: "default",
}

// ---------------------------------------------------------------------------
// In-memory fallback store (used when REDIS_URL is not configured or Redis
// fails). Keys are namespaced by `bucket` so two rate-limit instances don't
// share state.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Redis backend (shared singleton)
// ---------------------------------------------------------------------------
let redisClient: Redis | null = null
let redisConnectionAttempted = false

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient
  if (redisConnectionAttempted) return null

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    redisConnectionAttempted = true
    return null
  }

  try {
    redisConnectionAttempted = true
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null
        return Math.min(times * 200, 1000)
      },
      lazyConnect: true,
    })

    redisClient.on("error", (error) => {
      // Don't spam — Redis errors already log upstream. Keep a single warn so
      // operators notice during boot if REDIS_URL points somewhere wrong.
      console.warn("[RateLimit] Redis error, falling back to in-memory:", error.message)
    })

    redisClient.connect().catch((error) => {
      console.warn("[RateLimit] Failed to connect to Redis:", error.message)
      redisClient = null
    })

    return redisClient
  } catch (error) {
    console.warn("[RateLimit] Failed to create Redis client:", error)
    return null
  }
}

/**
 * Increment a rate-limit counter in Redis using an atomic Lua script.
 * Returns the current count and the TTL (ms) remaining on the key.
 *
 * The Lua script ensures INCR and PEXPIRE are executed atomically so the
 * expiry is only set on the first hit of a new window.
 */
async function redisIncrement(
  client: Redis,
  key: string,
  windowMs: number
): Promise<{ count: number; resetAt: number } | null> {
  const luaScript = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
      return {current, tonumber(ARGV[1])}
    end
    local pttl = redis.call('PTTL', KEYS[1])
    if pttl < 0 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
      pttl = tonumber(ARGV[1])
    end
    return {current, pttl}
  `

  try {
    const result = (await client.call("EVAL", luaScript, 1, key, String(windowMs))) as [
      number,
      number,
    ]
    const [count, pttl] = result
    return { count, resetAt: Date.now() + pttl }
  } catch (error) {
    console.warn("[RateLimit] Redis increment failed, falling back to in-memory:", error)
    return null
  }
}

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

    // Generate rate limit key (IP + path scoped to bucket)
    const clientKey = finalConfig.keyGenerator
      ? finalConfig.keyGenerator(ctx)
      : getClientIp(ctx, finalConfig.trustProxy ?? 1)
    const bucket = finalConfig.bucket ?? "default"
    const storeKey = `ratelimit:${bucket}:${clientKey}:${path}`

    // Try Redis first; fall back to in-memory on any failure.
    const client = getRedisClient()
    let count: number
    let resetAt: number

    const redisResult =
      client && client.status !== "end"
        ? await redisIncrement(client, storeKey, finalConfig.windowMs)
        : null

    if (redisResult) {
      count = redisResult.count
      resetAt = redisResult.resetAt
    } else {
      const now = Date.now()
      let entry = rateLimitStore.get(storeKey)
      if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + finalConfig.windowMs }
      }
      entry.count++
      rateLimitStore.set(storeKey, entry)
      count = entry.count
      resetAt = entry.resetAt
    }

    // Set rate limit headers
    const remaining = Math.max(0, finalConfig.max - count)
    const reset = Math.ceil(resetAt / 1000)

    ctx.set("X-RateLimit-Limit", String(finalConfig.max))
    ctx.set("X-RateLimit-Remaining", String(remaining))
    ctx.set("X-RateLimit-Reset", String(reset))

    // Check if rate limit exceeded
    if (count > finalConfig.max) {
      strapi.log.warn(
        `[RateLimit] Rate limit exceeded for ${clientKey} on ${path} (bucket=${bucket})`
      )

      ctx.status = 429
      ctx.body = {
        error: {
          status: 429,
          name: "TooManyRequestsError",
          message: finalConfig.message,
        },
      }
      ctx.set("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))))
      return
    }

    await next()
  }
}
