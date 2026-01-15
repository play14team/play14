/**
 * Account Lockout Service
 *
 * Provides protection against brute force login attacks by tracking failed
 * login attempts and temporarily locking accounts after too many failures.
 *
 * Uses in-memory storage with periodic cleanup via Strapi cron job.
 */

// Account lockout configuration
export const LOCKOUT_CONFIG = {
  maxAttempts: 5, // Lock after 5 failed attempts
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  // Cleanup threshold: remove entries that are both unlocked and have no recent activity
  cleanupThresholdMs: 30 * 60 * 1000, // 30 minutes
}

// In-memory store for failed login attempts (key: email/identifier lowercase)
interface LoginAttempt {
  count: number
  firstAttemptAt: number
  lockedUntil?: number
}

const loginAttempts = new Map<string, LoginAttempt>()

/**
 * Check if an account is currently locked
 */
export function checkAccountLockout(identifier: string): {
  isLocked: boolean
  remainingMs?: number
} {
  const key = identifier.toLowerCase()
  const now = Date.now()
  const attempt = loginAttempts.get(key)

  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    return { isLocked: true, remainingMs: attempt.lockedUntil - now }
  }

  return { isLocked: false }
}

/**
 * Record a failed login attempt
 * Returns whether the account is now locked and how many attempts remain
 */
export function recordFailedAttempt(identifier: string): {
  isNowLocked: boolean
  attemptsRemaining: number
} {
  const key = identifier.toLowerCase()
  const now = Date.now()
  let attempt = loginAttempts.get(key)

  // Reset if lockout expired or first attempt window passed
  if (
    !attempt ||
    (attempt.lockedUntil && attempt.lockedUntil < now) ||
    now - attempt.firstAttemptAt > LOCKOUT_CONFIG.lockoutDurationMs
  ) {
    attempt = { count: 0, firstAttemptAt: now }
  }

  attempt.count++
  const attemptsRemaining = Math.max(0, LOCKOUT_CONFIG.maxAttempts - attempt.count)

  if (attempt.count >= LOCKOUT_CONFIG.maxAttempts) {
    attempt.lockedUntil = now + LOCKOUT_CONFIG.lockoutDurationMs
    loginAttempts.set(key, attempt)
    return { isNowLocked: true, attemptsRemaining: 0 }
  }

  loginAttempts.set(key, attempt)
  return { isNowLocked: false, attemptsRemaining }
}

/**
 * Clear failed attempts on successful login
 */
export function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier.toLowerCase())
}

/**
 * Cleanup old entries from the lockout store
 * Called by cron job to prevent memory growth
 *
 * @returns Number of entries cleaned up
 */
export function cleanupLockoutStore(): number {
  const now = Date.now()
  let cleanedCount = 0

  for (const [key, attempt] of loginAttempts.entries()) {
    // Remove entries where:
    // 1. Lockout has expired (or never locked)
    // 2. No activity within cleanup threshold
    const lockExpired = !attempt.lockedUntil || attempt.lockedUntil < now
    const noRecentActivity = now - attempt.firstAttemptAt > LOCKOUT_CONFIG.cleanupThresholdMs

    if (lockExpired && noRecentActivity) {
      loginAttempts.delete(key)
      cleanedCount++
    }
  }

  return cleanedCount
}

/**
 * Get current store size (for monitoring/debugging)
 */
export function getLockoutStoreSize(): number {
  return loginAttempts.size
}
