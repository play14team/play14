import client from "prom-client"

// Business metrics registered on the default prom-client registry so the
// strapi-prometheus plugin can expose them.

/**
 * Get or create a metric to avoid duplicate registration errors when
 * multiple Strapi instances are created (e.g., during integration tests).
 */
function getOrCreateGauge<T extends string>(
  name: string,
  help: string,
  labelNames?: T[]
): client.Gauge<T> {
  const existing = client.register.getSingleMetric(name) as client.Gauge<T> | undefined
  if (existing) return existing
  return new client.Gauge<T>({ name, help, labelNames: labelNames ?? [] })
}

function getOrCreateCounter<T extends string>(
  name: string,
  help: string,
  labelNames?: T[]
): client.Counter<T> {
  const existing = client.register.getSingleMetric(name) as client.Counter<T> | undefined
  if (existing) return existing
  return new client.Counter<T>({ name, help, labelNames: labelNames ?? [] })
}

function getOrCreateHistogram<T extends string>(
  name: string,
  help: string,
  labelNames?: T[],
  buckets?: number[]
): client.Histogram<T> {
  const existing = client.register.getSingleMetric(name) as client.Histogram<T> | undefined
  if (existing) return existing
  return new client.Histogram<T>({ name, help, labelNames: labelNames ?? [], buckets })
}

// =============================================================================
// Business Metrics - Events
// =============================================================================

export const eventsTotal = getOrCreateGauge<"status">(
  "play14_events_total",
  "Total number of events by status",
  ["status"]
)

export const eventsTicketingMode = getOrCreateGauge<"mode">(
  "play14_events_ticketing_mode",
  "Number of events by ticketing mode",
  ["mode"]
)

// =============================================================================
// Business Metrics - Ticketing
// =============================================================================

export const ticketOrdersTotal = getOrCreateGauge<"status">(
  "play14_ticket_orders_total",
  "Total ticket orders by status",
  ["status"]
)

export const ticketOrdersAmountTotal = getOrCreateGauge<"currency" | "status">(
  "play14_ticket_orders_amount_total",
  "Total ticket order amounts by currency and status",
  ["currency", "status"]
)

export const ticketsTotal = getOrCreateGauge<"status">(
  "play14_tickets_total",
  "Total tickets by status",
  ["status"]
)

export const ticketsCheckedInTotal = getOrCreateGauge(
  "play14_tickets_checked_in_total",
  "Total number of checked-in tickets"
)

export const ticketTypesCapacity = getOrCreateGauge(
  "play14_ticket_types_capacity_total",
  "Total ticket capacity across all ticket types"
)

export const ticketTypesSold = getOrCreateGauge(
  "play14_ticket_types_sold_total",
  "Total tickets sold across all ticket types"
)

export const ticketTypesAvailable = getOrCreateGauge(
  "play14_ticket_types_available_total",
  "Total available tickets (capacity - sold - reserved)"
)

// =============================================================================
// Business Metrics - Discounts
// =============================================================================

export const discountCodesTotal = getOrCreateGauge<"active">(
  "play14_discount_codes_total",
  "Total discount codes by active status",
  ["active"]
)

export const discountCodesUsageTotal = getOrCreateGauge(
  "play14_discount_codes_usage_total",
  "Total discount code usages"
)

export const discountAmountTotal = getOrCreateGauge<"currency">(
  "play14_discount_amount_total",
  "Total discount amounts applied by currency",
  ["currency"]
)

// =============================================================================
// Business Metrics - Community
// =============================================================================

export const playersTotal = getOrCreateGauge<"position">(
  "play14_players_total",
  "Total players by position",
  ["position"]
)

export const stripeAccountsTotal = getOrCreateGauge<"status">(
  "play14_stripe_accounts_total",
  "Total Stripe accounts by status",
  ["status"]
)

export const attendanceClaimsTotal = getOrCreateGauge<"status">(
  "play14_attendance_claims_total",
  "Total attendance claims by status",
  ["status"]
)

// =============================================================================
// Business Metrics - Content
// =============================================================================

export const gamesTotal = getOrCreateGauge<"category">(
  "play14_games_total",
  "Total games by category",
  ["category"]
)

export const articlesTotal = getOrCreateGauge<"category">(
  "play14_articles_total",
  "Total articles by category",
  ["category"]
)

// =============================================================================
// Operational Metrics - Stripe API
// =============================================================================

export const stripeApiCallsTotal = getOrCreateCounter<"operation" | "status">(
  "play14_stripe_api_calls_total",
  "Total Stripe API calls by operation and status",
  ["operation", "status"]
)

export const stripeApiDuration = getOrCreateHistogram<"operation">(
  "play14_stripe_api_duration_seconds",
  "Stripe API call duration in seconds",
  ["operation"],
  [0.1, 0.25, 0.5, 1, 2, 5, 10]
)

// =============================================================================
// Operational Metrics - Email
// =============================================================================

export const emailSendTotal = getOrCreateCounter<"email_type" | "status">(
  "play14_email_send_total",
  "Total email send attempts by type and status",
  ["email_type", "status"]
)

export const emailSendDuration = getOrCreateHistogram<"email_type">(
  "play14_email_send_duration_seconds",
  "Email send duration in seconds",
  ["email_type"],
  [0.5, 1, 2, 5, 10, 30]
)

// =============================================================================
// Operational Metrics - Webhooks
// =============================================================================

export const webhookProcessingTotal = getOrCreateCounter<"event_type" | "status">(
  "play14_webhook_processing_total",
  "Total webhooks processed by type and status",
  ["event_type", "status"]
)

export const webhookProcessingDuration = getOrCreateHistogram<"event_type">(
  "play14_webhook_processing_duration_seconds",
  "Webhook processing duration in seconds",
  ["event_type"],
  [0.1, 0.5, 1, 2, 5, 10, 30]
)

// =============================================================================
// Operational Metrics - Ticket Orders
// =============================================================================

export const ticketOrderOperationsTotal = getOrCreateCounter<"operation" | "status">(
  "play14_ticket_order_operations_total",
  "Total ticket order operations by operation and status",
  ["operation", "status"]
)

export const ticketOrderOperationDuration = getOrCreateHistogram<"operation">(
  "play14_ticket_order_operation_duration_seconds",
  "Ticket order operation duration in seconds",
  ["operation"],
  [0.1, 0.5, 1, 2, 5, 10]
)
