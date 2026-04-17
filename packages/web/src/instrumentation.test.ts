import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Mock the metrics library
vi.mock("@/libs/metrics", () => ({
  getMetrics: vi.fn().mockResolvedValue("# HELP fake_metric A test metric\nfake_metric 42\n"),
  getContentType: vi.fn().mockReturnValue("text/plain; version=0.0.4"),
}))

/**
 * Integration tests for the Prometheus metrics HTTP server started by
 * instrumentation.ts. We replicate the server creation logic here so
 * we can bind to a random port and test request handling in isolation.
 */
describe("Metrics server", () => {
  let server: ReturnType<typeof createServer>
  let baseUrl: string
  const metricsPath = "/metrics"

  beforeAll(async () => {
    const { getMetrics, getContentType } = await import("@/libs/metrics")

    server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost")
      if (url.pathname === metricsPath && req.method === "GET") {
        try {
          const metrics = await getMetrics()
          res.writeHead(200, { "Content-Type": getContentType() })
          res.end(metrics)
        } catch {
          res.writeHead(500)
          res.end("Failed to collect metrics")
        }
      } else {
        res.writeHead(404)
        res.end("Not found")
      }
    })

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve)
    })

    const addr = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  afterAll(() => {
    server?.close()
  })

  it("should return Prometheus metrics on GET /metrics", async () => {
    const res = await fetch(`${baseUrl}/metrics`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("text/plain; version=0.0.4")
    const body = await res.text()
    expect(body).toContain("fake_metric 42")
  })

  it("should return 404 for unknown paths", async () => {
    const res = await fetch(`${baseUrl}/unknown`)
    expect(res.status).toBe(404)
  })

  it("should return 404 for non-GET methods on /metrics", async () => {
    const res = await fetch(`${baseUrl}/metrics`, { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("should handle query strings on /metrics", async () => {
    const res = await fetch(`${baseUrl}/metrics?debug=true`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("fake_metric 42")
  })
})
