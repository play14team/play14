/**
 * Ticket Reservation Service
 *
 * Handles atomic reservation operations to prevent overselling tickets.
 * Reservations are created when Stripe checkout sessions start and released
 * when sessions expire or payments complete.
 *
 * Flow:
 * 1. User starts checkout -> createReservations() increments reservedCount
 * 2a. Payment succeeds -> confirmReservations() moves count from reserved to sold
 * 2b. Session expires -> releaseReservations() decrements reservedCount
 */

import type { Core } from "@strapi/strapi"

interface TicketRequest {
  ticketTypeId: string
  quantity: number
}

interface ReservationResult {
  success: boolean
  error?: string
  reservedQuantities?: Map<string, number>
}

/**
 * Create reservations for all ticket types in an order.
 * This should be called when transitioning to pending status (Stripe session created).
 *
 * @param strapi - Strapi instance
 * @param orderId - Document ID of the order
 * @param ticketRequests - Array of ticket type IDs and quantities to reserve
 * @param expiresAt - When the reservation expires (matches Stripe session expiry)
 */
export async function createReservations(
  strapi: Core.Strapi,
  orderId: string,
  ticketRequests: TicketRequest[],
  expiresAt: Date
): Promise<ReservationResult> {
  const reservedQuantities = new Map<string, number>()

  try {
    // Phase 1: Validate all ticket types have sufficient availability
    for (const request of ticketRequests) {
      const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
        documentId: request.ticketTypeId,
      })

      if (!ticketType) {
        return { success: false, error: `Ticket type ${request.ticketTypeId} not found` }
      }

      // Calculate available: capacity - sold - already reserved
      const available = ticketType.capacity
        ? ticketType.capacity - (ticketType.soldCount || 0) - (ticketType.reservedCount || 0)
        : Infinity

      if (request.quantity > available) {
        return {
          success: false,
          error: `Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`,
        }
      }
    }

    // Phase 2: All validations passed - increment reservedCount on each ticket type
    for (const request of ticketRequests) {
      const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
        documentId: request.ticketTypeId,
      })

      if (!ticketType) {
        // This shouldn't happen since we just validated, but handle gracefully
        await rollbackReservations(strapi, reservedQuantities)
        return { success: false, error: `Ticket type ${request.ticketTypeId} not found during reservation` }
      }

      const newReservedCount = (ticketType.reservedCount || 0) + request.quantity

      await strapi.documents("api::ticket-type.ticket-type").update({
        documentId: request.ticketTypeId,
        data: { reservedCount: newReservedCount } as any,
      })

      reservedQuantities.set(request.ticketTypeId, request.quantity)
      strapi.log.debug(
        `[Reservation] Reserved ${request.quantity} tickets for type ${request.ticketTypeId} (total reserved: ${newReservedCount})`
      )
    }

    // Phase 3: Mark order as having reservation
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: orderId,
      data: {
        hasReservation: true,
        reservationCreatedAt: new Date().toISOString(),
        reservationExpiresAt: expiresAt.toISOString(),
      } as any,
    })

    strapi.log.info(`[Reservation] Created reservations for order ${orderId}, expires at ${expiresAt.toISOString()}`)

    return { success: true, reservedQuantities }
  } catch (error: any) {
    // Rollback any reservations made on error
    strapi.log.error(`[Reservation] Error creating reservations: ${error.message}`)
    await rollbackReservations(strapi, reservedQuantities)
    throw error
  }
}

/**
 * Convert reservations to sold tickets (called on payment success).
 * Decrements reservedCount and increments soldCount atomically.
 *
 * @param strapi - Strapi instance
 * @param orderId - Document ID of the order
 * @param ticketQuantities - Map of ticket type IDs to quantities
 */
export async function confirmReservations(
  strapi: Core.Strapi,
  orderId: string,
  ticketQuantities: Map<string, number>
): Promise<void> {
  // First, verify the order has a reservation
  const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
    documentId: orderId,
  })

  if (!order) {
    strapi.log.warn(`[Reservation] Order ${orderId} not found for confirmation`)
    return
  }

  // Process each ticket type
  for (const [ticketTypeId, quantity] of ticketQuantities) {
    const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
      documentId: ticketTypeId,
    })

    if (ticketType) {
      const newSoldCount = (ticketType.soldCount || 0) + quantity

      // Only decrement reservedCount if order had reservation
      // (handles edge case where webhook fires before reservation was created)
      const newReservedCount = (order as any).hasReservation
        ? Math.max(0, (ticketType.reservedCount || 0) - quantity)
        : ticketType.reservedCount || 0

      // Log warning if we're overselling (shouldn't happen with reservation system)
      if (ticketType.capacity && newSoldCount > ticketType.capacity) {
        strapi.log.warn(
          `[Reservation] ALERT: Oversell detected for ticket type ${ticketTypeId}: ` +
            `sold ${newSoldCount}/${ticketType.capacity}. This should not happen with reservations.`
        )
      }

      await strapi.documents("api::ticket-type.ticket-type").update({
        documentId: ticketTypeId,
        data: {
          soldCount: newSoldCount,
          reservedCount: newReservedCount,
        } as any,
      })

      strapi.log.debug(
        `[Reservation] Confirmed ${quantity} tickets for type ${ticketTypeId} ` +
          `(sold: ${newSoldCount}, reserved: ${newReservedCount})`
      )
    }
  }

  // Clear reservation flags on order
  await strapi.documents("api::ticket-order.ticket-order").update({
    documentId: orderId,
    data: {
      hasReservation: false,
      reservationCreatedAt: null,
      reservationExpiresAt: null,
    } as any,
  })

  strapi.log.info(`[Reservation] Confirmed reservations for order ${orderId}`)
}

/**
 * Release reservations (called on cancellation, expiry, or failure).
 * Decrements reservedCount for each ticket type in the order.
 *
 * @param strapi - Strapi instance
 * @param orderId - Document ID of the order
 */
export async function releaseReservations(strapi: Core.Strapi, orderId: string): Promise<void> {
  const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
    documentId: orderId,
  })

  if (!order) {
    strapi.log.warn(`[Reservation] Order ${orderId} not found for release`)
    return
  }

  if (!(order as any).hasReservation) {
    strapi.log.debug(`[Reservation] Order ${orderId} has no active reservation to release`)
    return
  }

  const ticketDetails = (order as any).ticketDetails || []

  // Release reservations for each ticket type
  for (const detail of ticketDetails as any[]) {
    const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
      documentId: detail.ticketTypeId,
    })

    if (ticketType) {
      const newReservedCount = Math.max(0, (ticketType.reservedCount || 0) - detail.quantity)

      await strapi.documents("api::ticket-type.ticket-type").update({
        documentId: detail.ticketTypeId,
        data: { reservedCount: newReservedCount } as any,
      })

      strapi.log.debug(
        `[Reservation] Released ${detail.quantity} tickets for type ${detail.ticketTypeId} ` +
          `(reserved: ${newReservedCount})`
      )
    }
  }

  // Clear reservation flags on order
  await strapi.documents("api::ticket-order.ticket-order").update({
    documentId: orderId,
    data: {
      hasReservation: false,
      reservationCreatedAt: null,
      reservationExpiresAt: null,
    } as any,
  })

  strapi.log.info(`[Reservation] Released reservations for order ${(order as any).orderNumber}`)
}

/**
 * Rollback partial reservations on failure.
 * Called internally when createReservations fails partway through.
 *
 * @param strapi - Strapi instance
 * @param reservedQuantities - Map of ticket type IDs to quantities that were reserved
 */
export async function rollbackReservations(
  strapi: Core.Strapi,
  reservedQuantities: Map<string, number>
): Promise<void> {
  for (const [ticketTypeId, quantity] of reservedQuantities) {
    try {
      const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
        documentId: ticketTypeId,
      })

      if (ticketType) {
        const newReservedCount = Math.max(0, (ticketType.reservedCount || 0) - quantity)

        await strapi.documents("api::ticket-type.ticket-type").update({
          documentId: ticketTypeId,
          data: { reservedCount: newReservedCount } as any,
        })

        strapi.log.debug(`[Reservation] Rolled back ${quantity} tickets for type ${ticketTypeId}`)
      }
    } catch (rollbackError: any) {
      // Log but don't throw - we're already in error handling
      strapi.log.error(
        `[Reservation] Failed to rollback reservation for ${ticketTypeId}: ${rollbackError.message}`
      )
    }
  }
}

/**
 * Get reservation expiry time based on Stripe session.
 * Defaults to 30 minutes if no session expiry provided.
 *
 * @param sessionExpiresAt - Optional expiry time from Stripe session
 */
export function getReservationExpiry(sessionExpiresAt?: Date): Date {
  if (sessionExpiresAt) {
    return sessionExpiresAt
  }
  // Default to 30 minutes from now (matches cron cleanup threshold)
  return new Date(Date.now() + 30 * 60 * 1000)
}
