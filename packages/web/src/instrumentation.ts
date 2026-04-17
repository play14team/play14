/**
 * Next.js instrumentation hook
 *
 * Starts a separate Prometheus metrics HTTP server on port 9000 (configurable
 * via METRICS_PORT). Clever Cloud's Warp10 scrapes this port over localhost —
 * it's never routed to the public edge, so no auth is needed.
 *
 * This mirrors the strapi-prometheus plugin's separate-server approach so
 * both apps expose metrics on the same port with the same convention.
 */
export async function register() {
  // Only start the metrics server on the Node.js server runtime,
  // not during build or in the Edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { createServer } = await import("node:http")
    const { getMetrics, getContentType } = await import("@/libs/metrics")

    const port = Number(process.env.METRICS_PORT) || 9000
    const host = process.env.METRICS_HOST || "0.0.0.0"
    const path = process.env.METRICS_PATH || "/metrics"

    // Port 9000 is not routed to the public edge on Clever Cloud — no auth needed.
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://${host}:${port}`)
      if (url.pathname === path && req.method === "GET") {
        try {
          const metrics = await getMetrics()
          res.writeHead(200, { "Content-Type": getContentType() })
          res.end(metrics)
        } catch (error) {
          console.error("[Metrics] Failed to collect metrics:", error)
          res.writeHead(500)
          res.end("Failed to collect metrics")
        }
      } else {
        res.writeHead(404)
        res.end("Not found")
      }
    })

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[Metrics] Port ${port} already in use, skipping metrics server`)
      } else {
        console.error("[Metrics] Server error:", err)
      }
    })

    server.listen(port, host, () => {
      console.log(`[Metrics] Prometheus server listening on ${host}:${port}${path}`)
    })
  }
}
