/**
 * Distributed Lock Service for Cron Jobs
 *
 * Uses Redis to ensure that cron jobs only run on one container at a time
 * in multi-container deployments. Implements a simple but robust locking
 * mechanism using Redis SET with NX (only set if not exists) and PX (expiry).
 *
 * The lock automatically expires after a configurable TTL to prevent deadlocks
 * if a container crashes while holding a lock.
 */

import Redis from "ioredis"
import { randomBytes } from "node:crypto"

// Singleton Redis client
let redisClient: Redis | null = null
let connectionAttempted = false

// Unique identifier for this container instance
const instanceId = randomBytes(8).toString("hex")

/**
 * Get or create the Redis client singleton
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient
  }

  if (connectionAttempted) {
    return null
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.log("[CronLock] REDIS_URL not configured, distributed locking disabled")
    connectionAttempted = true
    return null
  }

  try {
    connectionAttempted = true
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error("[CronLock] Redis connection failed after 3 retries, giving up")
          return null
        }
        return Math.min(times * 200, 1000)
      },
      lazyConnect: true,
    })

    redisClient.on("error", (error) => {
      console.error("[CronLock] Redis error:", error.message)
    })

    redisClient.on("connect", () => {
      console.log("[CronLock] Connected to Redis")
    })

    // Connect asynchronously
    redisClient.connect().catch((error) => {
      console.error("[CronLock] Failed to connect to Redis:", error.message)
      redisClient = null
    })

    return redisClient
  } catch (error) {
    console.error("[CronLock] Failed to create Redis client:", error)
    return null
  }
}

/**
 * Acquire a distributed lock for a cron task
 *
 * @param taskName - Unique name of the cron task
 * @param ttlMs - Lock expiry time in milliseconds (default: 5 minutes)
 * @returns Lock token if acquired, null if lock is held by another instance
 */
export async function acquireLock(
  taskName: string,
  ttlMs: number = 5 * 60 * 1000
): Promise<string | null> {
  const client = getRedisClient()

  if (!client) {
    // Redis not available - allow task to run (fallback to no locking)
    // This maintains backward compatibility when Redis is not configured
    return `no-redis-${instanceId}`
  }

  const lockKey = `cron:lock:${taskName}`
  const lockValue = `${instanceId}:${Date.now()}`

  try {
    // SET key value NX PX ttl
    // NX = only set if not exists
    // PX = expire in milliseconds
    const result = await client.set(lockKey, lockValue, "PX", ttlMs, "NX")

    if (result === "OK") {
      console.log(`[CronLock] Acquired lock for ${taskName} (instance: ${instanceId})`)
      return lockValue
    }

    // Lock is held by another instance
    const holder = await client.get(lockKey)
    const holderId = holder?.split(":")[0] || "unknown"
    console.log(`[CronLock] Lock for ${taskName} held by instance ${holderId}, skipping`)
    return null
  } catch (error) {
    console.error(`[CronLock] Error acquiring lock for ${taskName}:`, error)
    // On error, allow task to run to avoid complete failure
    return `error-fallback-${instanceId}`
  }
}

/**
 * Release a distributed lock
 *
 * Uses a Lua script executed via Redis EVAL to ensure we only release
 * our own lock (not one acquired by another instance after ours expired).
 * This is the standard atomic delete-if-matches pattern in Redis.
 *
 * @param taskName - Unique name of the cron task
 * @param lockToken - The token returned by acquireLock
 */
export async function releaseLock(taskName: string, lockToken: string): Promise<void> {
  // If we got a fallback token, there's nothing to release
  if (lockToken.startsWith("no-redis-") || lockToken.startsWith("error-fallback-")) {
    return
  }

  const client = getRedisClient()
  if (!client) {
    return
  }

  const lockKey = `cron:lock:${taskName}`

  try {
    // Use Redis EVAL with Lua script for atomic delete-if-matches
    // This is the standard safe way to release locks in Redis
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
    // ioredis eval() is the Redis EVAL command, not JavaScript eval()
    await client.call("EVAL", luaScript, 1, lockKey, lockToken)
    console.log(`[CronLock] Released lock for ${taskName}`)
  } catch (error) {
    console.error(`[CronLock] Error releasing lock for ${taskName}:`, error)
  }
}

/**
 * Wrapper function to run a cron task with distributed locking
 *
 * @param taskName - Unique name of the cron task
 * @param taskFn - The cron task function to execute
 * @param ttlMs - Lock expiry time in milliseconds (default: 5 minutes)
 * @returns Wrapped function that acquires lock before running
 */
export function withDistributedLock<T extends (...args: any[]) => Promise<any>>(
  taskName: string,
  taskFn: T,
  ttlMs: number = 5 * 60 * 1000
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
    const lockToken = await acquireLock(taskName, ttlMs)

    if (!lockToken) {
      // Lock is held by another instance, skip this execution
      return
    }

    try {
      return await taskFn(...args)
    } finally {
      await releaseLock(taskName, lockToken)
    }
  }) as T
}

/**
 * Gracefully close the Redis connection
 * Should be called during application shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
      console.log("[CronLock] Redis connection closed")
    } catch (error) {
      console.error("[CronLock] Error closing Redis connection:", error)
    }
    redisClient = null
  }
}

/**
 * Check if Redis is available for distributed locking
 */
export function isRedisAvailable(): boolean {
  const client = getRedisClient()
  return client !== null && client.status === "ready"
}

/**
 * Get the current instance ID (useful for debugging)
 */
export function getInstanceId(): string {
  return instanceId
}
