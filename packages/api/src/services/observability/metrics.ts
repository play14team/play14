import client from "prom-client"

// Create a dedicated registry for our metrics
export const registry = new client.Registry()

// Add default metrics (CPU, memory, event loop lag, GC, etc.)
client.collectDefaultMetrics({ register: registry })

// =============================================================================
// HTTP Metrics
// =============================================================================

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
})

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [registry],
})

// =============================================================================
// Database Metrics
// =============================================================================

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "model"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
})

export const dbConnectionPoolSize = new client.Gauge({
  name: "db_connection_pool_size",
  help: "Current size of database connection pool",
  labelNames: ["state"],
  registers: [registry],
})

// =============================================================================
// Cron Job Metrics
// =============================================================================

export const cronJobExecutions = new client.Counter({
  name: "cron_job_executions_total",
  help: "Total cron job executions",
  labelNames: ["job", "status"],
  registers: [registry],
})

export const cronJobDuration = new client.Histogram({
  name: "cron_job_duration_seconds",
  help: "Duration of cron job executions",
  labelNames: ["job"],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  registers: [registry],
})

// =============================================================================
// Business Metrics - Events
// =============================================================================

export const eventsTotal = new client.Gauge({
  name: "play14_events_total",
  help: "Total number of events by status",
  labelNames: ["status"],
  registers: [registry],
})

export const eventsTicketingMode = new client.Gauge({
  name: "play14_events_ticketing_mode",
  help: "Number of events by ticketing mode",
  labelNames: ["mode"],
  registers: [registry],
})

// =============================================================================
// Business Metrics - Ticketing
// =============================================================================

export const ticketOrdersTotal = new client.Gauge({
  name: "play14_ticket_orders_total",
  help: "Total ticket orders by status",
  labelNames: ["status"],
  registers: [registry],
})

export const ticketOrdersAmountTotal = new client.Gauge({
  name: "play14_ticket_orders_amount_total",
  help: "Total ticket order amounts by currency and status",
  labelNames: ["currency", "status"],
  registers: [registry],
})

export const ticketsTotal = new client.Gauge({
  name: "play14_tickets_total",
  help: "Total tickets by status",
  labelNames: ["status"],
  registers: [registry],
})

export const ticketsCheckedInTotal = new client.Gauge({
  name: "play14_tickets_checked_in_total",
  help: "Total number of checked-in tickets",
  registers: [registry],
})

export const ticketTypesCapacity = new client.Gauge({
  name: "play14_ticket_types_capacity_total",
  help: "Total ticket capacity across all ticket types",
  registers: [registry],
})

export const ticketTypesSold = new client.Gauge({
  name: "play14_ticket_types_sold_total",
  help: "Total tickets sold across all ticket types",
  registers: [registry],
})

export const ticketTypesAvailable = new client.Gauge({
  name: "play14_ticket_types_available_total",
  help: "Total available tickets (capacity - sold - reserved)",
  registers: [registry],
})

// =============================================================================
// Business Metrics - Discounts
// =============================================================================

export const discountCodesTotal = new client.Gauge({
  name: "play14_discount_codes_total",
  help: "Total discount codes by active status",
  labelNames: ["active"],
  registers: [registry],
})

export const discountCodesUsageTotal = new client.Gauge({
  name: "play14_discount_codes_usage_total",
  help: "Total discount code usages",
  registers: [registry],
})

export const discountAmountTotal = new client.Gauge({
  name: "play14_discount_amount_total",
  help: "Total discount amounts applied by currency",
  labelNames: ["currency"],
  registers: [registry],
})

// =============================================================================
// Business Metrics - Community
// =============================================================================

export const playersTotal = new client.Gauge({
  name: "play14_players_total",
  help: "Total players by position",
  labelNames: ["position"],
  registers: [registry],
})

export const stripeAccountsTotal = new client.Gauge({
  name: "play14_stripe_accounts_total",
  help: "Total Stripe accounts by status",
  labelNames: ["status"],
  registers: [registry],
})

export const attendanceClaimsTotal = new client.Gauge({
  name: "play14_attendance_claims_total",
  help: "Total attendance claims by status",
  labelNames: ["status"],
  registers: [registry],
})

// =============================================================================
// Business Metrics - Content
// =============================================================================

export const gamesTotal = new client.Gauge({
  name: "play14_games_total",
  help: "Total games by category",
  labelNames: ["category"],
  registers: [registry],
})

export const articlesTotal = new client.Gauge({
  name: "play14_articles_total",
  help: "Total articles by category",
  labelNames: ["category"],
  registers: [registry],
})

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get metrics output in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics()
}

/**
 * Get the content type for the metrics endpoint
 */
export function getContentType(): string {
  return registry.contentType
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  registry.resetMetrics()
}
