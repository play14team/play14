import type { Core } from "@strapi/strapi"

type SentryContext = {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

export function reportSentryError(
  strapi: Core.Strapi,
  error: unknown,
  context?: SentryContext
): void {
  try {
    const sentryConfig = strapi.config.get("plugin::sentry") as { dsn?: string | null }
    if (!sentryConfig?.dsn) {
      return
    }

    const sentryService = strapi.plugin("sentry")?.service("sentry")
    if (!sentryService) {
      return
    }

    sentryService.sendError(error, (scope: any) => {
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value)
        }
      }

      if (context?.extra) {
        scope.setContext("context", context.extra)
      }
    })
  } catch {
    // Ignore Sentry reporting failures to avoid masking the original error.
  }
}
