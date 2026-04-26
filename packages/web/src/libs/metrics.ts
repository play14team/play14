import client from "prom-client"

// Singleton registry to avoid re-registration errors
let registry: client.Registry | null = null

/**
 * Get or create the Prometheus registry with all metrics
 */
export function getRegistry(): client.Registry {
  if (registry) {
    return registry
  }

  registry = new client.Registry()

  // Clever Cloud auto-injects APP_ID; the Grafana dashboards filter on
  // {app_id=~"$APP_ID"}, so every series must carry it.
  registry.setDefaultLabels({
    app: "play14-web",
    app_id: process.env.APP_ID ?? "play14-web",
    environment: process.env.NODE_ENV ?? "development",
  })

  // Add default metrics (CPU, memory, event loop lag, etc.)
  client.collectDefaultMetrics({ register: registry })

  // HTTP request metrics
  new client.Histogram({
    name: "nextjs_request_duration_seconds",
    help: "Duration of Next.js requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  })

  new client.Counter({
    name: "nextjs_requests_total",
    help: "Total number of Next.js requests",
    labelNames: ["method", "route", "status_code"],
    registers: [registry],
  })

  // Server action metrics
  new client.Counter({
    name: "nextjs_server_action_total",
    help: "Total server action calls",
    labelNames: ["action", "status"],
    registers: [registry],
  })

  new client.Histogram({
    name: "nextjs_server_action_duration_seconds",
    help: "Duration of server action calls in seconds",
    labelNames: ["action"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  })

  // API client metrics (Strapi API calls)
  new client.Counter({
    name: "nextjs_strapi_api_requests_total",
    help: "Total Strapi API requests",
    labelNames: ["method", "endpoint", "status_code"],
    registers: [registry],
  })

  new client.Histogram({
    name: "nextjs_strapi_api_duration_seconds",
    help: "Duration of Strapi API requests in seconds",
    labelNames: ["method", "endpoint"],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  })

  return registry
}

/**
 * Get metrics output in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return getRegistry().metrics()
}

/**
 * Get the content type for the metrics endpoint
 */
export function getContentType(): string {
  return getRegistry().contentType
}
