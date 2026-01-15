// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

// Default sample rate from environment
const defaultSampleRate = parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1")

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable if DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tag for filtering in Sentry (development, acceptance, production)
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Enable structured logging
  enableLogs: true,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration({
      // Track long tasks (>50ms) that block the main thread
      enableLongTask: true,
      // Track Interaction to Next Paint (Core Web Vital)
      enableInp: true,
      // Parameterize URLs to group similar transactions
      beforeStartSpan: (context) => {
        return {
          ...context,
          // Normalize dynamic segments in URLs
          name: context.name
            .replace(/\/events\/[^/]+/, "/events/:slug")
            .replace(/\/players\/[^/]+/, "/players/:slug")
            .replace(/\/orders\/[^/]+/, "/orders/:id")
            .replace(/\/tickets\/[^/]+/, "/tickets/:id"),
        }
      },
    }),
    // Capture console.log/warn/error and send to Sentry Logs
    Sentry.consoleLoggingIntegration({
      levels: ["warn", "error"],
    }),
  ],

  // Configure which backend URLs receive distributed tracing headers
  // SECURITY: Use restrictive patterns that only match the hostname portion.
  // Avoid unrestricted wildcards that could match play14.org anywhere in the URL.
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.play14\./,
    /^https:\/\/[a-z0-9-]+\.play14\.org\/api/,
  ],

  // Dynamic sampling based on transaction importance
  tracesSampler: ({ name, parentSampled }) => {
    // Always skip health checks and static assets
    if (name.includes("healthcheck") || name.includes("_next/static")) {
      return 0
    }

    // Always capture checkout and payment transactions (critical path)
    if (name.includes("checkout") || name.includes("payment") || name.includes("order")) {
      return 1.0
    }

    // Always capture auth transactions
    if (name.includes("auth") || name.includes("login")) {
      return 1.0
    }

    // Inherit parent sampling decision for distributed traces
    if (typeof parentSampled === "boolean") {
      return parentSampled
    }

    // Default to configured sample rate
    return defaultSampleRate
  },

  // Define how likely Replay events are sampled.
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
