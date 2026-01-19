// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

// Default sample rate from environment
const defaultSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1")

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable if DSN is configured
  enabled: !!process.env.SENTRY_DSN,

  // Environment tag for filtering in Sentry (development, acceptance, production)
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Enable structured logging
  enableLogs: true,

  // Dynamic sampling based on transaction importance
  tracesSampler: ({ name, parentSampled }) => {
    // Always skip health checks
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

    // Always capture API routes that affect data
    if (name.includes("POST") || name.includes("PUT") || name.includes("DELETE")) {
      return 0.5
    }

    // Inherit parent sampling decision for distributed traces
    if (typeof parentSampled === "boolean") {
      return parentSampled
    }

    // Default to configured sample rate
    return defaultSampleRate
  },

  // Filter out noisy server errors
  ignoreErrors: [
    // Network errors that are usually transient
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "UND_ERR_CONNECT_TIMEOUT",

    // Next.js navigation
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],
})
