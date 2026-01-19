/**
 * Structured logger for services that don't have direct access to strapi.log
 *
 * Provides consistent JSON-formatted logging with contextual information
 * for better observability and log aggregation.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  /** Unique identifier for tracing a request across services */
  correlationId?: string
  /** Order number or ID */
  orderId?: string
  /** Event document ID */
  eventId?: string
  /** Stripe session ID */
  sessionId?: string
  /** Stripe event ID (for webhooks) */
  stripeEventId?: string
  /** Stripe account ID */
  stripeAccountId?: string
  /** User/player ID */
  userId?: string | number
  /** Player document ID */
  playerId?: string
  /** Operation name for metrics */
  operation?: string
  /** Duration in milliseconds */
  durationMs?: number
  /** Additional arbitrary context */
  [key: string]: unknown
}

interface StructuredLog {
  timestamp: string
  level: LogLevel
  prefix: string
  message: string
  context?: LogContext
  error?: {
    message: string
    code?: string
    stack?: string
  }
}

/**
 * Create a prefixed logger for a specific module
 *
 * @example
 * const log = createLogger("[Stripe]")
 * log.info("Checkout session created", { sessionId, orderId })
 */
export function createLogger(prefix: string) {
  const formatLog = (
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): string => {
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      prefix,
      message,
      context: context && Object.keys(context).length > 0 ? context : undefined,
      error: error
        ? {
            message: error.message,
            code: (error as any).code,
            stack: level === "error" ? error.stack : undefined,
          }
        : undefined,
    }

    // Return JSON for structured logging in production
    // In development, also output human-readable format
    if (process.env.NODE_ENV === "production") {
      return JSON.stringify(log)
    }

    // Human-readable format for development
    let output = `${prefix} ${message}`
    if (context) {
      const contextParts = Object.entries(context)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
      if (contextParts.length > 0) {
        output += ` | ${contextParts.join(", ")}`
      }
    }
    if (error) {
      output += ` | error=${error.message}`
      if ((error as any).code) {
        output += ` code=${(error as any).code}`
      }
    }
    return output
  }

  return {
    debug(message: string, context?: LogContext): void {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(formatLog("debug", message, context))
      }
    },

    info(message: string, context?: LogContext): void {
      console.info(formatLog("info", message, context))
    },

    warn(message: string, context?: LogContext, error?: Error): void {
      console.warn(formatLog("warn", message, context, error))
    },

    error(message: string, context?: LogContext, error?: Error): void {
      console.error(formatLog("error", message, context, error))
    },
  }
}

/**
 * Generate a correlation ID for request tracing
 * Uses a timestamp + random string format for sortability
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

/**
 * Timer utility for measuring operation duration
 *
 * @example
 * const timer = startTimer()
 * await someOperation()
 * const durationMs = timer.elapsed()
 */
export function startTimer(): { elapsed: () => number } {
  const start = performance.now()
  return {
    elapsed: () => Math.round(performance.now() - start),
  }
}
