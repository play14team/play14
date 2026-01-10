// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable if DSN is configured
  enabled: !!process.env.SENTRY_DSN,

  // Environment tag for filtering in Sentry (development, acceptance, production)
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Define how likely traces are sampled. Adjust this value in production.
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),

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
