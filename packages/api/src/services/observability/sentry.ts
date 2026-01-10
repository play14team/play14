import * as Sentry from "@sentry/node"

let initialized = false

/**
 * Initialize Sentry for error tracking and APM.
 * Should be called early in the application lifecycle (register hook).
 */
export function initSentry(): void {
  if (initialized) {
    return
  }

  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    console.log("[Sentry] No SENTRY_DSN configured, skipping initialization")
    return
  }

  const enabled = process.env.SENTRY_ENABLED !== "false"
  if (!enabled) {
    console.log("[Sentry] Disabled via SENTRY_ENABLED=false")
    return
  }

  Sentry.init({
    dsn,
    // Environment tag for filtering in Sentry (development, acceptance, production)
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.npm_package_version,

    // Performance monitoring - sample 10% of transactions
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),

    // HTTP integration for automatic request tracing
    integrations: [Sentry.httpIntegration()],

    // Don't send PII by default
    sendDefaultPii: false,

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors that are usually transient
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      // Rate limiting is expected behavior
      "Too many requests",
    ],

  })

  initialized = true
  console.log("[Sentry] Initialized successfully")
}

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): string {
  if (context) {
    Sentry.setContext("additional", context)
  }
  return Sentry.captureException(error)
}

/**
 * Capture a message with severity level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
): string {
  return Sentry.captureMessage(message, level)
}

/**
 * Set user context for error tracking
 */
export function setUser(user: {
  id: string
  email?: string
  username?: string
}): void {
  Sentry.setUser(user)
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null)
}

/**
 * Start a cron job check-in for monitoring
 */
export function startCronCheckIn(monitorSlug: string): string {
  return Sentry.captureCheckIn({
    monitorSlug,
    status: "in_progress",
  })
}

/**
 * Complete a cron job check-in
 */
export function completeCronCheckIn(
  checkInId: string,
  monitorSlug: string,
  status: "ok" | "error"
): void {
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug,
    status,
  })
}

/**
 * Wrap a cron task with Sentry monitoring
 */
export function wrapCronTask<T>(
  taskName: string,
  taskFn: (context: T) => Promise<void>
): (context: T) => Promise<void> {
  return async (context: T) => {
    const checkInId = startCronCheckIn(taskName)

    try {
      await taskFn(context)
      completeCronCheckIn(checkInId, taskName, "ok")
    } catch (error) {
      completeCronCheckIn(checkInId, taskName, "error")
      captureException(error, { cronTask: taskName })
      throw error
    }
  }
}

// Re-export Sentry for direct access when needed
export { Sentry }
