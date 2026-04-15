import { NextResponse } from "next/server"
import { getContentType, getMetrics } from "@/libs/metrics"

/**
 * GET /api/metrics
 * Returns Prometheus metrics for the Next.js application.
 *
 * On Clever Cloud, Warp10 scrapes this endpoint over localhost using the
 * CC_METRICS_PROMETHEUS_PORT / CC_METRICS_PROMETHEUS_PATH env vars. When
 * CC_METRICS_PROMETHEUS_USER / CC_METRICS_PROMETHEUS_PASSWORD are set, the
 * scraper authenticates with HTTP Basic Auth. If no credentials are set,
 * the endpoint stays open (Clever Cloud network isolation keeps it private).
 *
 * The legacy METRICS_TOKEN / x-metrics-token header is also still accepted
 * for backwards compatibility and for scrapers running outside Clever Cloud.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" && !isAuthorized(request)) {
    console.warn("[Metrics] Unauthorized access attempt")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const metrics = await getMetrics()
    return new NextResponse(metrics, {
      headers: {
        "Content-Type": getContentType(),
      },
    })
  } catch (error) {
    console.error("[Metrics] Failed to collect metrics:", error)
    return NextResponse.json({ error: "Failed to collect metrics" }, { status: 500 })
  }
}

function isAuthorized(request: Request): boolean {
  const basicUser = process.env.CC_METRICS_PROMETHEUS_USER
  const basicPassword = process.env.CC_METRICS_PROMETHEUS_PASSWORD
  const token = process.env.METRICS_TOKEN

  // No auth configured → rely on Clever Cloud network isolation.
  // Warp10 scrapes from localhost, not the public edge, so the endpoint
  // is not reachable externally as long as no public route exposes it.
  if (!basicUser && !basicPassword && !token) {
    return true
  }

  if (basicUser && basicPassword && matchesBasicAuth(request, basicUser, basicPassword)) {
    return true
  }

  if (token && request.headers.get("x-metrics-token") === token) {
    return true
  }

  return false
}

function matchesBasicAuth(request: Request, user: string, password: string): boolean {
  const header = request.headers.get("authorization")
  if (!header?.toLowerCase().startsWith("basic ")) {
    return false
  }

  try {
    const decoded = atob(header.slice("basic ".length).trim())
    const separator = decoded.indexOf(":")
    if (separator === -1) {
      return false
    }
    const providedUser = decoded.slice(0, separator)
    const providedPassword = decoded.slice(separator + 1)
    return providedUser === user && providedPassword === password
  } catch {
    return false
  }
}
