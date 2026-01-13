import client from "prom-client"

// Business metrics registered on the default prom-client registry so the
// strapi-prometheus plugin can expose them.

// =============================================================================
// Business Metrics - Events
// =============================================================================

export const eventsTotal = new client.Gauge({
  name: "play14_events_total",
  help: "Total number of events by status",
  labelNames: ["status"],
})

export const eventsTicketingMode = new client.Gauge({
  name: "play14_events_ticketing_mode",
  help: "Number of events by ticketing mode",
  labelNames: ["mode"],
})

// =============================================================================
// Business Metrics - Ticketing
// =============================================================================

export const ticketOrdersTotal = new client.Gauge({
  name: "play14_ticket_orders_total",
  help: "Total ticket orders by status",
  labelNames: ["status"],
})

export const ticketOrdersAmountTotal = new client.Gauge({
  name: "play14_ticket_orders_amount_total",
  help: "Total ticket order amounts by currency and status",
  labelNames: ["currency", "status"],
})

export const ticketsTotal = new client.Gauge({
  name: "play14_tickets_total",
  help: "Total tickets by status",
  labelNames: ["status"],
})

export const ticketsCheckedInTotal = new client.Gauge({
  name: "play14_tickets_checked_in_total",
  help: "Total number of checked-in tickets",
})

export const ticketTypesCapacity = new client.Gauge({
  name: "play14_ticket_types_capacity_total",
  help: "Total ticket capacity across all ticket types",
})

export const ticketTypesSold = new client.Gauge({
  name: "play14_ticket_types_sold_total",
  help: "Total tickets sold across all ticket types",
})

export const ticketTypesAvailable = new client.Gauge({
  name: "play14_ticket_types_available_total",
  help: "Total available tickets (capacity - sold - reserved)",
})

// =============================================================================
// Business Metrics - Discounts
// =============================================================================

export const discountCodesTotal = new client.Gauge({
  name: "play14_discount_codes_total",
  help: "Total discount codes by active status",
  labelNames: ["active"],
})

export const discountCodesUsageTotal = new client.Gauge({
  name: "play14_discount_codes_usage_total",
  help: "Total discount code usages",
})

export const discountAmountTotal = new client.Gauge({
  name: "play14_discount_amount_total",
  help: "Total discount amounts applied by currency",
  labelNames: ["currency"],
})

// =============================================================================
// Business Metrics - Community
// =============================================================================

export const playersTotal = new client.Gauge({
  name: "play14_players_total",
  help: "Total players by position",
  labelNames: ["position"],
})

export const stripeAccountsTotal = new client.Gauge({
  name: "play14_stripe_accounts_total",
  help: "Total Stripe accounts by status",
  labelNames: ["status"],
})

export const attendanceClaimsTotal = new client.Gauge({
  name: "play14_attendance_claims_total",
  help: "Total attendance claims by status",
  labelNames: ["status"],
})

// =============================================================================
// Business Metrics - Content
// =============================================================================

export const gamesTotal = new client.Gauge({
  name: "play14_games_total",
  help: "Total games by category",
  labelNames: ["category"],
})

export const articlesTotal = new client.Gauge({
  name: "play14_articles_total",
  help: "Total articles by category",
  labelNames: ["category"],
})
