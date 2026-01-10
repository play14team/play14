/**
 * Next.js instrumentation hook
 *
 * This file is automatically loaded by Next.js when the app starts.
 * It initializes Sentry for server-side and edge runtime error tracking.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}
