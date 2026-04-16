import { NextResponse } from "next/server"
import { getContentType, getMetrics } from "@/libs/metrics"

/**
 * GET /api/metrics
 * Returns Prometheus metrics for the Next.js application.
 *
 * In production, Clever Cloud's Warp10 scrapes the separate metrics server
 * started in instrumentation.ts (port 9000). This route is kept as a
 * convenience for local development and debugging.
 */
export async function GET() {
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
