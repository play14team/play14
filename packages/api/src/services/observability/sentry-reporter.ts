import type { Core } from "@strapi/strapi"
import { createLogger } from "./logger"

const log = createLogger("[ErrorReporter]")

type SentryContext = {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

export function reportSentryError(
  _strapi: Core.Strapi,
  error: unknown,
  context?: SentryContext
): void {
  const err = error instanceof Error ? error : new Error(String(error))
  log.error(err.message, { ...context?.tags, ...context?.extra }, err)
}
