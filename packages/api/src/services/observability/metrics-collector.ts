/**
 * Business metrics collector for Prometheus
 *
 * Periodically collects business metrics from the database
 * and updates Prometheus gauges. This avoids expensive queries
 * on every metrics scrape.
 */

import type { Core } from "@strapi/strapi"
import {
  eventsTotal,
  eventsTicketingMode,
  ticketOrdersTotal,
  ticketOrdersAmountTotal,
  ticketsTotal,
  ticketsCheckedInTotal,
  ticketTypesCapacity,
  ticketTypesSold,
  ticketTypesAvailable,
  discountCodesTotal,
  discountCodesUsageTotal,
  discountAmountTotal,
  playersTotal,
  stripeAccountsTotal,
  attendanceClaimsTotal,
  gamesTotal,
  articlesTotal,
} from "./metrics"
import { reportSentryError } from "./sentry-reporter"

/**
 * Collect all business metrics
 * Should be called periodically (e.g., every 5 minutes via cron)
 */
export async function collectBusinessMetrics(strapi: Core.Strapi): Promise<void> {
  const startTime = Date.now()
  strapi.log.debug("[MetricsCollector] Starting business metrics collection")

  try {
    await Promise.all([
      collectEventMetrics(strapi),
      collectTicketingMetrics(strapi),
      collectDiscountMetrics(strapi),
      collectCommunityMetrics(strapi),
      collectContentMetrics(strapi),
    ])

    const duration = Date.now() - startTime
    strapi.log.debug(
      `[MetricsCollector] Business metrics collection completed in ${duration}ms`
    )
  } catch (error) {
    strapi.log.error(`[MetricsCollector] Failed to collect metrics: ${error}`)
    reportSentryError(strapi, error, {
      tags: { cron_task: "collectMetrics", module: "metrics-collector" },
      extra: { task: "collectBusinessMetrics" },
    })
  }
}

/**
 * Collect event-related metrics
 */
async function collectEventMetrics(strapi: Core.Strapi): Promise<void> {
  const db = strapi.db

  // Event counts by status
  const eventStatuses = ["Announced", "Open", "Over", "Cancelled"]
  for (const status of eventStatuses) {
    const count = await db.query("api::event.event").count({
      where: { eventStatus: status },
    })
    eventsTotal.set({ status }, count)
  }

  // Event counts by ticketing mode
  const ticketingModes = ["none", "internal", "external"]
  for (const mode of ticketingModes) {
    const count = await db.query("api::event.event").count({
      where: { ticketingMode: mode },
    })
    eventsTicketingMode.set({ mode }, count)
  }
}

/**
 * Collect ticketing-related metrics
 */
async function collectTicketingMetrics(strapi: Core.Strapi): Promise<void> {
  const db = strapi.db

  // Ticket order counts by status
  const orderStatuses = [
    "draft",
    "pending",
    "processing",
    "paid",
    "cancelled",
    "refunded",
    "partially_refunded",
    "expired",
    "failed",
  ]
  for (const status of orderStatuses) {
    const count = await db.query("api::ticket-order.ticket-order").count({
      where: { status },
    })
    ticketOrdersTotal.set({ status }, count)
  }

  // Ticket order amounts - only for paid orders
  // Group by currency
  const paidOrders = await db.query("api::ticket-order.ticket-order").findMany({
    where: { status: "paid" },
    select: ["totalAmount", "currency"],
  })

  const amountByCurrency: Record<string, number> = {}
  for (const order of paidOrders) {
    const currency = order.currency || "EUR"
    amountByCurrency[currency] =
      (amountByCurrency[currency] || 0) + (order.totalAmount || 0)
  }
  for (const [currency, amount] of Object.entries(amountByCurrency)) {
    ticketOrdersAmountTotal.set({ currency, status: "paid" }, amount)
  }

  // Ticket counts by status
  const ticketStatuses = ["valid", "used", "cancelled", "refunded"]
  for (const status of ticketStatuses) {
    const count = await db.query("api::ticket.ticket").count({
      where: { ticketStatus: status },
    })
    ticketsTotal.set({ status }, count)
  }

  // Checked-in tickets count
  const checkedInCount = await db.query("api::ticket.ticket").count({
    where: {
      checkedInAt: { $notNull: true },
    },
  })
  ticketsCheckedInTotal.set(checkedInCount)

  // Ticket type capacity metrics
  const ticketTypes = await db.query("api::ticket-type.ticket-type").findMany({
    select: ["capacity", "soldCount", "reservedCount"],
  })

  let totalCapacity = 0
  let totalSold = 0
  let totalAvailable = 0

  for (const tt of ticketTypes) {
    const capacity = tt.capacity || 0
    const sold = tt.soldCount || 0
    const reserved = tt.reservedCount || 0
    totalCapacity += capacity
    totalSold += sold
    totalAvailable += Math.max(0, capacity - sold - reserved)
  }

  ticketTypesCapacity.set(totalCapacity)
  ticketTypesSold.set(totalSold)
  ticketTypesAvailable.set(totalAvailable)
}

/**
 * Collect discount-related metrics
 */
async function collectDiscountMetrics(strapi: Core.Strapi): Promise<void> {
  const db = strapi.db

  // Active vs inactive discount codes
  const activeCount = await db.query("api::discount-code.discount-code").count({
    where: { isActive: true },
  })
  const inactiveCount = await db
    .query("api::discount-code.discount-code")
    .count({
      where: { isActive: false },
    })
  discountCodesTotal.set({ active: "true" }, activeCount)
  discountCodesTotal.set({ active: "false" }, inactiveCount)

  // Total discount usage
  const codes = await db.query("api::discount-code.discount-code").findMany({
    select: ["usedCount"],
  })
  const totalUsage = codes.reduce(
    (sum: number, code: { usedCount?: number }) => sum + (code.usedCount || 0),
    0
  )
  discountCodesUsageTotal.set(totalUsage)

  // Total discount amounts from orders
  const ordersWithDiscount = await db
    .query("api::ticket-order.ticket-order")
    .findMany({
      where: {
        discountAmount: { $gt: 0 },
        status: "paid",
      },
      select: ["discountAmount", "currency"],
    })

  const discountByCurrency: Record<string, number> = {}
  for (const order of ordersWithDiscount) {
    const currency = order.currency || "EUR"
    discountByCurrency[currency] =
      (discountByCurrency[currency] || 0) + (order.discountAmount || 0)
  }
  for (const [currency, amount] of Object.entries(discountByCurrency)) {
    discountAmountTotal.set({ currency }, amount)
  }
}

/**
 * Collect community-related metrics
 */
async function collectCommunityMetrics(strapi: Core.Strapi): Promise<void> {
  const db = strapi.db

  // Player counts by position
  const positions = ["Player", "Host", "Mentor", "Founder"]
  for (const position of positions) {
    const count = await db.query("api::player.player").count({
      where: { position },
    })
    playersTotal.set({ position }, count)
  }

  // Stripe account counts by status
  const stripeStatuses = ["pending", "active", "restricted", "disabled"]
  for (const status of stripeStatuses) {
    const count = await db.query("api::stripe-account.stripe-account").count({
      where: { accountStatus: status },
    })
    stripeAccountsTotal.set({ status }, count)
  }

  // Attendance claim counts by status
  const claimStatuses = ["pending", "approved", "rejected"]
  for (const status of claimStatuses) {
    const count = await db
      .query("api::attendance-claim.attendance-claim")
      .count({
        where: { claimStatus: status },
      })
    attendanceClaimsTotal.set({ status }, count)
  }
}

/**
 * Collect content-related metrics
 */
async function collectContentMetrics(strapi: Core.Strapi): Promise<void> {
  const db = strapi.db

  // Game counts by category
  const gameCategories = [
    "Game",
    "IceBreaker",
    "WarmUp",
    "Facilitation",
    "Retrospective",
    "CoolDown",
  ]
  for (const category of gameCategories) {
    const count = await db.query("api::game.game").count({
      where: { category },
    })
    gamesTotal.set({ category }, count)
  }

  // Article counts by category
  const articleCategories = [
    "Announcement",
    "Article",
    "Event",
    "Interview",
    "Meetup",
  ]
  for (const category of articleCategories) {
    const count = await db.query("api::article.article").count({
      where: { category },
    })
    articlesTotal.set({ category }, count)
  }
}
