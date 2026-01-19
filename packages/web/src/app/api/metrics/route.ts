import { getContentType, getMetrics } from "@/libs/metrics"
import { NextResponse } from "next/server"

/**
 * GET /api/metrics
 * Returns Prometheus metrics for the Next.js application
 *
 * Security: In production, only allows internal requests or token authentication
 */
export async function GET(request: Request) {
  // Security: In production, only allow internal requests or token auth
  if (process.env.NODE_ENV === "production") {
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown"
    const metricsToken = request.headers.get("x-metrics-token")
    const expectedToken = process.env.METRICS_TOKEN

    const isInternal =
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("10.") ||
      ip.startsWith("172.16.") ||
      ip.startsWith("172.17.") ||
      ip.startsWith("172.18.") ||
      ip.startsWith("172.19.") ||
      ip.startsWith("172.2") ||
      ip.startsWith("172.3") ||
      ip.startsWith("192.168.")

    // Allow if internal OR if valid token provided
    if (!isInternal && (!expectedToken || metricsToken !== expectedToken)) {
      console.warn(`[Metrics] Unauthorized access attempt from ${ip}`)
      return NextResponse.json({ error: "Metrics endpoint is internal only" }, { status: 403 })
    }
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
