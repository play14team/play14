// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
    if (name.includes("healthcheck")) {
      return 0
    }

    // Always capture checkout and payment transactions (critical path)
    if (name.includes("checkout") || name.includes("payment") || name.includes("order")) {
      return 1.0
    }

    // Inherit parent sampling decision for distributed traces
    if (typeof parentSampled === "boolean") {
      return parentSampled
    }

    // Default to configured sample rate
    return defaultSampleRate
  },
})
