/**
 * Cron tasks for ticket order management
 */

import type { Core } from "@strapi/strapi"

/**
 * Clean up expired pending ticket orders and release reservations
 * Stripe checkout sessions expire after 30 minutes by default
 *
 * This function is safe for multi-container deployments:
 * - Uses atomic conditional UPDATE to claim orders for processing
 * - Uses atomic SQL to decrement reservation counts
 */
export async function cleanExpiredTicketOrders(strapi: Core.Strapi): Promise<void> {
  console.log("Running expired ticket orders cleanup job")
  const apiName = "api::ticket-order.ticket-order"
  const knex = strapi.db.connection

  const now = new Date()
  // Fallback: Orders older than 30 minutes that are still pending
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  // Find orders that are expired either by:
  // 1. reservationExpiresAt has passed (explicit Stripe session expiry)
  // 2. createdAt is older than 30 minutes (fallback for orders without explicit expiry)
  const expiredOrders = await strapi.documents(apiName).findMany({
    filters: {
      orderStatus: "pending",
      $or: [
        { reservationExpiresAt: { $lt: now.toISOString() } },
        {
          reservationExpiresAt: { $null: true },
          createdAt: { $lt: thirtyMinutesAgo.toISOString() },
        },
      ],
    },
  })

  console.log("Expired pending orders found:", expiredOrders.length)

  // Process each order sequentially to properly release reservations
  for (const order of expiredOrders) {
    // ATOMIC CLAIM: Try to claim this order for processing
    // This prevents duplicate processing in multi-container deployments
    const claimResult = await knex("ticket_orders")
      .where("document_id", order.documentId)
      .where("order_status", "pending")
      .update({
        order_status: "expiring",
        updated_at: new Date(),
      })

    if (claimResult === 0) {
      // Another container already claimed this order or status changed
      console.log(`Order ${order.orderNumber} already being processed, skipping`)
      continue
    }

    console.log(`Processing expired order ${order.orderNumber}`)

    try {
      // Release reservations if order has them using atomic SQL
      if (order.hasReservation) {
        const ticketDetails = (order.ticketDetails || []) as Array<{
          ticketTypeId: string
          quantity: number
        }>

        for (const detail of ticketDetails) {
          // ATOMIC: Decrement reserved_count without read-then-update race condition
          await knex.raw(
            `UPDATE ticket_types
             SET reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - ?),
                 updated_at = NOW()
             WHERE document_id = ?`,
            [detail.quantity, detail.ticketTypeId]
          )

          console.log(
            `Released ${detail.quantity} reservations for ticket type ${detail.ticketTypeId}`
          )
        }
      }

      // Mark order as expired and clear reservation flags
      await strapi.documents(apiName).update({
        documentId: order.documentId,
        data: {
          orderStatus: "expired",
          hasReservation: false,
          reservationCreatedAt: null,
          reservationExpiresAt: null,
        } as any,
      })

      console.log(`Order ${order.orderNumber} marked as expired`)
    } catch (error) {
      // Processing failed - revert status back to pending for retry
      console.error(`Failed to process expired order ${order.orderNumber}:`, error)
      await knex("ticket_orders")
        .where("document_id", order.documentId)
        .where("order_status", "expiring")
        .update({
          order_status: "pending",
          updated_at: new Date(),
        })
    }
  }
}

/**
 * Clean up abandoned draft orders
 * Draft orders are created when users start filling attendee info but don't complete checkout
 */
export async function cleanAbandonedDraftOrders(strapi: Core.Strapi): Promise<void> {
  console.log("Running abandoned draft orders cleanup job")
  const apiName = "api::ticket-order.ticket-order"

  // Find draft orders older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const abandonedDrafts = await strapi.documents(apiName).findMany({
    filters: {
      orderStatus: "draft",
      createdAt: { $lt: twentyFourHoursAgo.toISOString() },
    },
    populate: {
      discountCode: { fields: ["documentId", "code", "reservedCount"] },
    },
  })

  console.log("Abandoned draft orders found:", abandonedDrafts.length)

  for (const order of abandonedDrafts) {
    console.log(`Processing abandoned draft order ${order.orderNumber}`)

    // Note: Draft orders don't have discount code reservations
    // (reservations are only made during finalizeCheckout when status changes to pending)

    // Mark order as cancelled
    await strapi.documents(apiName).update({
      documentId: order.documentId,
      data: {
        orderStatus: "cancelled",
      } as any,
    })

    console.log(`Draft order ${order.orderNumber} cancelled (abandoned)`)
  }
}

/**
 * Health check for reservation count drift
 * Detects if reservedCount on ticket types doesn't match actual pending reservations
 */
export async function reservationHealthCheck(strapi: Core.Strapi): Promise<void> {
  console.log("Running reservation health check")
  const orderApiName = "api::ticket-order.ticket-order"
  const ticketTypeApiName = "api::ticket-type.ticket-type"

  // Find all ticket types with non-zero reservedCount
  const ticketTypesWithReservations = await strapi.documents(ticketTypeApiName).findMany({
    filters: {
      reservedCount: { $gt: 0 },
    },
  })

  if (ticketTypesWithReservations.length === 0) {
    console.log("No ticket types with reservations to check")
    return
  }

  // For each ticket type, calculate expected reservations from pending orders
  for (const ticketType of ticketTypesWithReservations) {
    // Find all pending orders with reservations for this ticket type
    const ordersWithReservation = await strapi.documents(orderApiName).findMany({
      filters: {
        orderStatus: "pending",
        hasReservation: true,
      },
    })

    // Sum up reserved quantities for this ticket type
    let expectedReserved = 0
    for (const order of ordersWithReservation) {
      const ticketDetails = (order.ticketDetails || []) as Array<{
        ticketTypeId: string
        quantity: number
      }>
      for (const detail of ticketDetails) {
        if (detail.ticketTypeId === ticketType.documentId) {
          expectedReserved += detail.quantity
        }
      }
    }

    const actualReserved = (ticketType as any).reservedCount || 0
    const drift = actualReserved - expectedReserved

    if (drift !== 0) {
      console.warn(
        `[Reservation Drift] Ticket type ${ticketType.documentId} (${(ticketType as any).name}): ` +
          `actual=${actualReserved}, expected=${expectedReserved}, drift=${drift}`
      )
    }
  }

  console.log("Reservation health check completed")
}
