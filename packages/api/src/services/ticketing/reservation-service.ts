/**
 * Ticket Reservation Service
 *
 * Handles atomic reservation operations to prevent overselling tickets.
 * Reservations are created when Stripe checkout sessions start and released
 * when sessions expire or payments complete.
 *
 * SECURITY: Uses database transactions with conditional updates to prevent
 * race conditions (TOCTOU vulnerabilities) that could lead to overselling.
 *
 * Flow:
 * 1. User starts checkout -> createReservations() atomically increments reservedCount
 * 2a. Payment succeeds -> confirmReservations() atomically moves count from reserved to sold
 * 2b. Session expires -> releaseReservations() atomically decrements reservedCount
 */

import type { Core } from "@strapi/strapi"

// Database connection type - using 'any' since Knex is a transitive dependency
// and may not have type declarations available directly
type DatabaseConnection = any

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
 * Atomically reserve tickets using a conditional UPDATE.
 * This prevents race conditions by checking availability and updating in a single SQL statement.
 *
 * The UPDATE only succeeds if:
 * 1. The ticket type exists with the given document_id
 * 2. There's enough capacity: capacity IS NULL OR (sold_count + reserved_count + quantity <= capacity)
 *
 * @param knex - Knex connection
 * @param ticketTypeDocumentId - Document ID of the ticket type
 * @param quantity - Number of tickets to reserve
 * @returns Object with success flag and updated ticket type data
 */
async function atomicReserveTickets(
  knex: DatabaseConnection,
  ticketTypeDocumentId: string,
  quantity: number
): Promise<{ success: boolean; ticketType?: any; error?: string }> {
  // Use a raw SQL UPDATE with a WHERE clause that enforces availability
  // This is atomic - the database guarantees no race condition
  const result = await knex.raw(
    `
    UPDATE ticket_types
    SET reserved_count = COALESCE(reserved_count, 0) + ?
    WHERE document_id = ?
      AND (capacity IS NULL OR COALESCE(sold_count, 0) + COALESCE(reserved_count, 0) + ? <= capacity)
    RETURNING id, document_id, name, capacity, sold_count, reserved_count
    `,
    [quantity, ticketTypeDocumentId, quantity]
  )

  const updatedRows = result.rows || result
  if (updatedRows.length === 0) {
    // Either ticket type doesn't exist OR not enough capacity
    // Check which case it is
    const ticketType = await knex("ticket_types")
      .where("document_id", ticketTypeDocumentId)
      .first()

    if (!ticketType) {
      return { success: false, error: `Ticket type ${ticketTypeDocumentId} not found` }
    }

    const available = ticketType.capacity
      ? ticketType.capacity - (ticketType.sold_count || 0) - (ticketType.reserved_count || 0)
      : Infinity

    return {
      success: false,
      error: `Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`,
    }
  }

  return { success: true, ticketType: updatedRows[0] }
}

/**
 * Atomically release reserved tickets.
 * Decrements reserved_count, ensuring it doesn't go below 0.
 *
 * @param knex - Knex connection
 * @param ticketTypeDocumentId - Document ID of the ticket type
 * @param quantity - Number of tickets to release
 */
async function atomicReleaseTickets(
  knex: DatabaseConnection,
  ticketTypeDocumentId: string,
  quantity: number
): Promise<void> {
  await knex.raw(
    `
    UPDATE ticket_types
    SET reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - ?)
    WHERE document_id = ?
    `,
    [quantity, ticketTypeDocumentId]
  )
}

/**
 * Atomically confirm reserved tickets (move from reserved to sold).
 * Increments sold_count and decrements reserved_count in a single statement.
 *
 * @param knex - Knex connection
 * @param ticketTypeDocumentId - Document ID of the ticket type
 * @param quantity - Number of tickets to confirm
 * @param hadReservation - Whether the order had a reservation (affects reserved_count)
 */
async function atomicConfirmTickets(
  knex: DatabaseConnection,
  ticketTypeDocumentId: string,
  quantity: number,
  hadReservation: boolean
): Promise<void> {
  if (hadReservation) {
    // Move from reserved to sold
    await knex.raw(
      `
      UPDATE ticket_types
      SET sold_count = COALESCE(sold_count, 0) + ?,
          reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - ?)
      WHERE document_id = ?
      `,
      [quantity, quantity, ticketTypeDocumentId]
    )
  } else {
    // No reservation - just increment sold
    await knex.raw(
      `
      UPDATE ticket_types
      SET sold_count = COALESCE(sold_count, 0) + ?
      WHERE document_id = ?
      `,
      [quantity, ticketTypeDocumentId]
    )
  }
}

/**
 * Atomically sell tickets for free orders (direct increment, with capacity check).
 * Returns success/failure based on capacity availability.
 *
 * @param knex - Knex connection
 * @param ticketTypeDocumentId - Document ID of the ticket type
 * @param quantity - Number of tickets to sell
 * @returns Object with success flag and error message if failed
 */
async function atomicSellTickets(
  knex: DatabaseConnection,
  ticketTypeDocumentId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  // Use conditional UPDATE to check capacity atomically
  const result = await knex.raw(
    `
    UPDATE ticket_types
    SET sold_count = COALESCE(sold_count, 0) + ?
    WHERE document_id = ?
      AND (capacity IS NULL OR COALESCE(sold_count, 0) + COALESCE(reserved_count, 0) + ? <= capacity)
    RETURNING id, document_id, name, capacity, sold_count
    `,
    [quantity, ticketTypeDocumentId, quantity]
  )

  const updatedRows = result.rows || result
  if (updatedRows.length === 0) {
    // Check if ticket exists
    const ticketType = await knex("ticket_types")
      .where("document_id", ticketTypeDocumentId)
      .first()

    if (!ticketType) {
      return { success: false, error: `Ticket type ${ticketTypeDocumentId} not found` }
    }

    const available = ticketType.capacity
      ? ticketType.capacity - (ticketType.sold_count || 0) - (ticketType.reserved_count || 0)
      : Infinity

    return {
      success: false,
      error: `Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`,
    }
  }

  return { success: true }
}

/**
 * Create reservations for all ticket types in an order.
 * This should be called when transitioning to pending status (Stripe session created).
 *
 * SECURITY: Uses database transaction with conditional updates to prevent race conditions.
 * All reservations succeed or none do (atomic rollback on failure).
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
  const knex = strapi.db.connection as DatabaseConnection

  try {
    // Use database transaction to ensure all-or-nothing reservation
    await knex.transaction(async (trx) => {
      // Process each ticket type with atomic conditional update
      for (const request of ticketRequests) {
        const result = await atomicReserveTickets(trx, request.ticketTypeId, request.quantity)

        if (!result.success) {
          // Capacity check failed - throw to trigger rollback
          throw new Error(result.error)
        }

        reservedQuantities.set(request.ticketTypeId, request.quantity)
        strapi.log.debug(
          `[Reservation] Reserved ${request.quantity} tickets for type ${request.ticketTypeId} ` +
            `(total reserved: ${result.ticketType.reserved_count})`
        )
      }
    })

    // Transaction committed successfully - update order outside transaction
    // (order update is not critical for overselling protection)
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
    // Transaction was rolled back automatically
    strapi.log.warn(`[Reservation] Reservation failed for order ${orderId}: ${error.message}`)
    return { success: false, error: error.message }
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
  // First, verify the order exists and check reservation status
  const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
    documentId: orderId,
  })

  if (!order) {
    strapi.log.warn(`[Reservation] Order ${orderId} not found for confirmation`)
    return
  }

  const hadReservation = (order as any).hasReservation
  const knex = strapi.db.connection as DatabaseConnection

  // Use transaction for consistency (though individual updates are atomic)
  await knex.transaction(async (trx) => {
    for (const [ticketTypeId, quantity] of ticketQuantities) {
      await atomicConfirmTickets(trx, ticketTypeId, quantity, hadReservation)

      strapi.log.debug(
        `[Reservation] Confirmed ${quantity} tickets for type ${ticketTypeId}`
      )
    }
  })

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
  const knex = strapi.db.connection as DatabaseConnection

  // Use transaction for consistency
  await knex.transaction(async (trx) => {
    for (const detail of ticketDetails as any[]) {
      await atomicReleaseTickets(trx, detail.ticketTypeId, detail.quantity)

      strapi.log.debug(
        `[Reservation] Released ${detail.quantity} tickets for type ${detail.ticketTypeId}`
      )
    }
  })

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
 * NOTE: This function is kept for backward compatibility but is no longer
 * needed with transactional reservations. The database transaction handles rollback.
 *
 * @param strapi - Strapi instance
 * @param reservedQuantities - Map of ticket type IDs to quantities that were reserved
 */
export async function rollbackReservations(
  strapi: Core.Strapi,
  reservedQuantities: Map<string, number>
): Promise<void> {
  const knex = strapi.db.connection as DatabaseConnection

  for (const [ticketTypeId, quantity] of reservedQuantities) {
    try {
      await atomicReleaseTickets(knex, ticketTypeId, quantity)
      strapi.log.debug(`[Reservation] Rolled back ${quantity} tickets for type ${ticketTypeId}`)
    } catch (rollbackError: any) {
      // Log but don't throw - we're already in error handling
      strapi.log.error(
        `[Reservation] Failed to rollback reservation for ${ticketTypeId}: ${rollbackError.message}`
      )
    }
  }
}

/**
 * Atomically sell tickets for free orders with capacity enforcement.
 * Uses conditional UPDATE to prevent overselling.
 *
 * @param strapi - Strapi instance
 * @param ticketDetails - Array of ticket details with ticketTypeId and quantity
 * @returns Object with success flag and error message if any ticket failed
 */
export async function sellTicketsAtomic(
  strapi: Core.Strapi,
  ticketDetails: Array<{ ticketTypeId: string; quantity: number; ticketTypeName?: string }>
): Promise<{ success: boolean; error?: string }> {
  const knex = strapi.db.connection as DatabaseConnection

  try {
    await knex.transaction(async (trx) => {
      for (const detail of ticketDetails) {
        const result = await atomicSellTickets(trx, detail.ticketTypeId, detail.quantity)

        if (!result.success) {
          throw new Error(result.error)
        }

        strapi.log.debug(
          `[Reservation] Sold ${detail.quantity} tickets for type ${detail.ticketTypeId}`
        )
      }
    })

    return { success: true }
  } catch (error: any) {
    strapi.log.warn(`[Reservation] Failed to sell tickets: ${error.message}`)
    return { success: false, error: error.message }
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
