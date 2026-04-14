/**
 * Structured logger for the web package
 *
 * Provides consistent JSON-formatted logging with contextual information
 * for better observability in Clever Cloud log search and Grafana alerts.
 *
 * Based on the API logger pattern (packages/api/src/services/observability/logger.ts).
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  correlationId?: string
  eventId?: string
  orderId?: string
  userId?: string | number
  playerId?: string
  operation?: string
  durationMs?: number
  [key: string]: unknown
}

interface StructuredLog {
  timestamp: string
  level: LogLevel
  package: "web"
  prefix: string
  message: string
  context?: LogContext
  error?: {
    message: string
    code?: string
    stack?: string
  }
}

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
      package: "web",
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

    if (process.env.NODE_ENV === "production") {
      return JSON.stringify(log)
    }

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

export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

export function startTimer(): { elapsed: () => number } {
  const start = performance.now()
  return {
    elapsed: () => Math.round(performance.now() - start),
  }
}
