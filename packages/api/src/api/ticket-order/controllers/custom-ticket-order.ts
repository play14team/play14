/**
 * Custom controller for ticket order management
 * Handles ticket purchase flow, order status, and refunds
 */

import { join } from "node:path"
import type { Core } from "@strapi/strapi"
import { type InvoiceData, generateInvoicePDF } from "../../../libs/invoice"
import { generateOrderNumber, generateTicketCode } from "../../../libs/tickets"
import { sanitizeText, validateEmail, validateName } from "../../../libs/validation"
import {
  sendOrderConfirmationEmail,
  sendPlayerInvitationEmail,
  sendTicketSoldNotificationEmail,
} from "../../../services/email-templates"
import { getPaymentProvider } from "../../../services/payment"
import type { ConnectPaymentProvider } from "../../../services/payment/types"
import {
  ORDER_LIMITS,
  addPlayerToEventAttendees,
  createReservations,
  findOrCreatePlayerForAttendee as findOrCreatePlayerService,
  getReservationExpiry,
  releaseDiscountCode,
  releaseReservations,
  reserveDiscountCode,
  sellTicketsAtomic,
  useDiscountCodeAtomic,
} from "../../../services/ticketing"

interface AttendeeInfo {
  firstName: string
  lastName: string
  email: string
  tshirtSize?: string
  foodPreferences?: string
  photoConsent: boolean
  photoConsentTimestamp?: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get the current user's linked player
   */
  async getLinkedPlayer(userId: number) {
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: userId },
      populate: { player: true },
    })
    return userWithPlayer?.player || null
  },

  /**
   * Get available ticket types for an event
   * Supports both published and draft events (for preview functionality)
   */
  async getAvailableTickets(ctx) {
    const { eventId } = ctx.params

    // Try published first, then fall back to draft (for preview)
    let event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      status: "published",
      populate: {
        ticketTypes: true,
      },
    })

    if (!event) {
      // Try draft version for preview functionality
      event = await strapi.documents("api::event.event").findOne({
        documentId: eventId,
        status: "draft",
        populate: {
          ticketTypes: true,
        },
      })
    }

    if (!event) {
      return ctx.notFound("Event not found")
    }

    if (event.ticketingMode !== "internal") {
      return ctx.send({
        data: {
          eventId: event.documentId,
          eventName: event.name,
          ticketingEnabled: false,
          ticketTypes: [],
          hasPaymentProvider: false,
        },
      })
    }

    const now = new Date()
    const availableTypes = (event.ticketTypes || [])
      .filter((tt: any) => tt.isActive)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((tt: any) => {
        const validFrom = tt.validFrom ? new Date(tt.validFrom) : null
        const validUntil = tt.validUntil ? new Date(tt.validUntil) : null
        const notYetAvailable = validFrom && validFrom > now
        const expired = validUntil && validUntil < now
        const withinDateRange = !notYetAvailable && !expired

        // Calculate available: capacity - sold - reserved
        const effectiveUsed = (tt.soldCount || 0) + (tt.reservedCount || 0)
        const available = tt.capacity ? Math.max(0, tt.capacity - effectiveUsed) : null
        const soldOut = tt.capacity ? effectiveUsed >= tt.capacity : false

        return {
          documentId: tt.documentId,
          name: tt.name,
          description: tt.description,
          price: tt.price,
          currency: tt.currency,
          available,
          soldOut,
          // Date availability info
          validFrom: tt.validFrom,
          validUntil: tt.validUntil,
          notYetAvailable,
          expired,
          withinDateRange,
        }
      })

    return ctx.send({
      data: {
        eventId: event.documentId,
        eventName: event.name,
        ticketingEnabled: true,
        ticketingMode: event.ticketingMode,
        ticketTypes: availableTypes,
        hasPaymentProvider: event.ticketingMode === "internal",
      },
    })
  },

  /**
   * Validate and calculate discount for an order
   */
  async validateAndApplyDiscount(
    eventDocumentId: string,
    code: string,
    amount: number
  ): Promise<
    { id: number; documentId: string; code: string; discountAmount: number } | { error: string }
  > {
    // Find the discount code (case-insensitive)
    const discountCode = await strapi.documents("api::discount-code.discount-code").findFirst({
      filters: {
        code: { $eqi: code.trim() },
        event: { documentId: eventDocumentId },
      },
    })

    if (!discountCode) {
      return { error: "Invalid discount code" }
    }

    // Check if active
    if (!discountCode.isActive) {
      return { error: "This discount code is no longer active" }
    }

    // Check date validity
    const now = new Date()
    if (discountCode.validFrom && new Date(discountCode.validFrom) > now) {
      return { error: "This discount code is not yet active" }
    }
    if (discountCode.validUntil && new Date(discountCode.validUntil) < now) {
      return { error: "This discount code has expired" }
    }

    // Check usage limits
    if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
      return { error: "This discount code has reached its usage limit" }
    }

    // Check minimum order amount
    if (discountCode.minOrderAmount && amount < discountCode.minOrderAmount) {
      return {
        error: `Minimum order amount of ${discountCode.minOrderAmount} required for this code`,
      }
    }

    // Calculate discount
    let discountAmount: number
    if (discountCode.discountType === "percentage") {
      discountAmount = amount * (discountCode.discountValue / 100)
      // Apply max discount cap if set
      if (discountCode.maxDiscountAmount && discountAmount > discountCode.maxDiscountAmount) {
        discountAmount = discountCode.maxDiscountAmount
      }
    } else {
      // Fixed amount - cannot exceed order amount
      discountAmount = Math.min(discountCode.discountValue, amount)
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100

    return {
      id: discountCode.id,
      documentId: discountCode.documentId,
      code: discountCode.code,
      discountAmount,
    }
  },

  /**
   * Initiate a ticket order (creates order and returns checkout URL)
   * Requires authentication and a linked player profile
   */
  async initiateOrder(ctx) {
    const user = ctx.state.user

    // Require authentication
    if (!user) {
      return ctx.unauthorized("You must be logged in to purchase tickets")
    }

    // Require linked player profile
    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a player profile to purchase tickets", {
        details: { code: "PLAYER_REQUIRED" },
      })
    }

    const { eventId, tickets, discountCode: discountCodeString } = ctx.request.body?.data || {}

    if (!eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return ctx.badRequest("Event ID and tickets array are required")
    }

    // Validate ticket request structure
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      if (!ticket || typeof ticket !== "object") {
        return ctx.badRequest(`Ticket ${i + 1}: Invalid ticket object`)
      }
      if (!ticket.ticketTypeId || typeof ticket.ticketTypeId !== "string") {
        return ctx.badRequest(`Ticket ${i + 1}: ticketTypeId is required and must be a string`)
      }
      if (
        ticket.quantity === undefined ||
        typeof ticket.quantity !== "number" ||
        !Number.isInteger(ticket.quantity) ||
        ticket.quantity < 1 ||
        ticket.quantity > 100
      ) {
        return ctx.badRequest(`Ticket ${i + 1}: quantity must be a positive integer (1-100)`)
      }
    }

    // Use player data for purchaser info
    const email = user.email
    const name = player.name || user.username

    if (!email) {
      return ctx.badRequest("User email is required")
    }
    if (!name) {
      return ctx.badRequest("Player name is required")
    }

    // Fetch event with ticket types and Stripe account
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        ticketTypes: true,
        players: { fields: ["id"] },
        stripeAccount: true,
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    if (event.ticketingMode !== "internal") {
      return ctx.badRequest("Internal ticketing is not enabled for this event")
    }

    if (event.eventStatus !== "Open") {
      return ctx.badRequest("Event is not open for registration")
    }

    // Validate tickets and calculate total
    let originalAmount = 0
    let totalQuantity = 0
    const lineItems: Array<{
      name: string
      description?: string
      unitPrice: number
      quantity: number
    }> = []
    const ticketDetails: Array<{
      ticketTypeId: string
      ticketTypeName: string
      quantity: number
      unitPrice: number
      currency: string
    }> = []

    const now = new Date()

    for (const ticketRequest of tickets) {
      const ticketType = (event.ticketTypes || []).find(
        (tt: any) => tt.documentId === ticketRequest.ticketTypeId
      )

      if (!ticketType) {
        return ctx.badRequest(`Invalid ticket type: ${ticketRequest.ticketTypeId}`)
      }

      if (!ticketType.isActive) {
        return ctx.badRequest(`Ticket type ${ticketType.name} is not available`)
      }

      if (ticketType.validFrom && new Date(ticketType.validFrom) > now) {
        return ctx.badRequest(`Ticket type ${ticketType.name} is not yet available`)
      }

      if (ticketType.validUntil && new Date(ticketType.validUntil) < now) {
        return ctx.badRequest(`Ticket type ${ticketType.name} has expired`)
      }

      // Check ticket type capacity (includes reserved tickets)
      // Available = capacity - sold - reserved
      const effectiveUsed = (ticketType.soldCount || 0) + (ticketType.reservedCount || 0)
      const available = ticketType.capacity
        ? ticketType.capacity - effectiveUsed
        : Number.POSITIVE_INFINITY

      if (ticketRequest.quantity > available) {
        return ctx.badRequest(
          `Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`
        )
      }

      originalAmount += ticketType.price * ticketRequest.quantity
      totalQuantity += ticketRequest.quantity

      lineItems.push({
        name: `${event.name} - ${ticketType.name}`,
        description: ticketType.description || undefined,
        unitPrice: ticketType.price,
        quantity: ticketRequest.quantity,
      })

      ticketDetails.push({
        ticketTypeId: ticketType.documentId,
        ticketTypeName: ticketType.name,
        quantity: ticketRequest.quantity,
        unitPrice: ticketType.price,
        currency: ticketType.currency,
      })
    }

    // Apply discount code if provided - use atomic reservation to prevent TOCTOU race condition
    let discountAmount = 0
    let appliedDiscountCode: { id: number; documentId: string; code: string } | null = null

    if (discountCodeString) {
      // Use atomic reservation to prevent race condition where two users validate
      // the same discount code near its usage limit simultaneously
      const discountResult = await reserveDiscountCode(
        strapi,
        eventId,
        discountCodeString,
        originalAmount
      )

      if (!discountResult.success) {
        return ctx.badRequest(discountResult.error || "Failed to apply discount code")
      }

      discountAmount = discountResult.discountAmount!
      appliedDiscountCode = {
        id: discountResult.discountCode!.id,
        documentId: discountResult.discountCode!.documentId,
        code: discountResult.discountCode!.code,
      }
    }

    const totalAmount = originalAmount - discountAmount

    // Create order
    const orderNumber = generateOrderNumber()
    const currency = ticketDetails[0]?.currency || "EUR"

    const order = await strapi.documents("api::ticket-order.ticket-order").create({
      data: {
        orderNumber,
        status: "pending",
        originalAmount,
        discountAmount,
        totalAmount,
        currency,
        paymentProvider: "stripe",
        purchaserEmail: email,
        purchaserName: name,
        ticketDetails,
        player: player.id,
        event: event.id,
        discountCode: appliedDiscountCode?.id || null,
      } as any,
    })

    // Create Stripe checkout session
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"

    try {
      const provider = getPaymentProvider("stripe") as ConnectPaymentProvider

      // Check if event has a connected Stripe account for destination charges
      const connectedAccountId = event.stripeAccount?.stripeAccountId
      const accountIsActive = event.stripeAccount?.accountStatus === "active"

      let session

      if (connectedAccountId && accountIsActive) {
        // Use destination charges - funds go directly to host's account
        const platformFeePercent = Number.parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "0")
        const applicationFeeAmount = Math.round(totalAmount * 100 * (platformFeePercent / 100)) // Fee in cents

        session = await provider.createCheckoutSessionWithConnect({
          orderId: order.documentId,
          lineItems,
          currency,
          customerEmail: email,
          successUrl: `${frontendUrl}/events/${event.slug}/tickets/success?order=${order.documentId}`,
          cancelUrl: `${frontendUrl}/events/${event.slug}/tickets/cancelled?order=${order.documentId}`,
          metadata: {
            eventId: event.documentId,
            eventSlug: event.slug,
          },
          connectedAccountId,
          applicationFeeAmount,
        })

        strapi.log.info(
          `[Ticketing] Using Stripe Connect destination charges for account ${connectedAccountId}`
        )
      } else {
        // Fallback to platform account (legacy behavior)
        session = await provider.createCheckoutSession({
          orderId: order.documentId,
          lineItems,
          currency,
          customerEmail: email,
          successUrl: `${frontendUrl}/events/${event.slug}/tickets/success?order=${order.documentId}`,
          cancelUrl: `${frontendUrl}/events/${event.slug}/tickets/cancelled?order=${order.documentId}`,
          metadata: {
            eventId: event.documentId,
            eventSlug: event.slug,
          },
        })
      }

      // Update order with session info
      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: order.documentId,
        data: {
          providerSessionId: session.sessionId,
        } as any,
      })

      // Create reservations for the tickets
      const ticketRequests = tickets.map((t: any) => ({
        ticketTypeId: t.ticketTypeId,
        quantity: t.quantity,
      }))

      const reservationResult = await createReservations(
        strapi,
        order.documentId,
        ticketRequests,
        getReservationExpiry(session.expiresAt)
      )

      if (!reservationResult.success) {
        // Reservation failed - clean up order and release discount code reservation
        await strapi.documents("api::ticket-order.ticket-order").delete({
          documentId: order.documentId,
        })
        // Release the discount code reservation if one was made
        if (appliedDiscountCode) {
          await releaseDiscountCode(strapi, appliedDiscountCode.documentId)
        }
        strapi.log.warn(
          `[Ticketing] Reservation failed for order ${orderNumber}: ${reservationResult.error}`
        )
        return ctx.badRequest(reservationResult.error || "Failed to reserve tickets")
      }

      const discountInfo = appliedDiscountCode
        ? ` (discount: ${appliedDiscountCode.code} -${currency} ${discountAmount})`
        : ""
      strapi.log.info(
        `[Ticketing] Order ${orderNumber} created for event ${event.name} - ${totalQuantity} tickets, ${currency} ${totalAmount}${discountInfo}`
      )

      return ctx.send({
        data: {
          orderId: order.documentId,
          orderNumber,
          checkoutUrl: session.sessionUrl,
          expiresAt: session.expiresAt,
        },
      })
    } catch (error: any) {
      // Clean up the order and release discount code reservation if Stripe session creation fails
      await strapi.documents("api::ticket-order.ticket-order").delete({
        documentId: order.documentId,
      })
      // Release the discount code reservation if one was made
      if (appliedDiscountCode) {
        await releaseDiscountCode(strapi, appliedDiscountCode.documentId)
      }

      strapi.log.error(`[Ticketing] Failed to create checkout session: ${error.message}`)
      return ctx.internalServerError("Failed to create payment session")
    }
  },

  /**
   * Get order status and details
   * SECURITY: Unauthenticated users get limited info, authenticated owners get full details
   */
  async getOrderStatus(ctx) {
    const { orderId } = ctx.params
    const user = ctx.state.user

    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
      populate: {
        tickets: {
          populate: {
            ticketType: { fields: ["name", "price", "currency"] },
          },
        },
        event: {
          fields: ["name", "slug", "start", "end"],
          populate: {
            defaultImage: { fields: ["url", "width", "height"] },
            location: { fields: ["name"] },
          },
        },
        player: { fields: ["documentId", "name"] },
      },
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    // Determine access level
    let hasFullAccess = false

    if (user) {
      const player = await this.getLinkedPlayer(user.id)
      const isOwner =
        order.purchaserEmail === user.email || (player && order.player?.id === player.id)

      if (isOwner) {
        hasFullAccess = true
      } else {
        // Check if user is a host/mentor of the event
        const event = await strapi.documents("api::event.event").findOne({
          documentId: order.event?.documentId,
          populate: {
            hosts: { fields: ["id"] },
            mentors: { fields: ["id"] },
          },
        })

        const isOrganizer =
          player &&
          (event?.hosts?.some((h: any) => h.id === player.id) ||
            event?.mentors?.some((m: any) => m.id === player.id))

        if (isOrganizer) {
          hasFullAccess = true
        } else {
          return ctx.forbidden("Access denied")
        }
      }
    }

    // SECURITY: Unauthenticated users only see basic order status (no PII)
    // This allows the success/cancelled page to show order status after Stripe redirect
    if (!hasFullAccess) {
      return ctx.send({
        data: {
          documentId: order.documentId,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          currency: order.currency,
          // Mask purchaser info for unauthenticated requests
          purchaserName: `${order.purchaserName?.split(" ")[0]} ***`,
          paidAt: order.paidAt,
          event: order.event
            ? {
                name: order.event.name,
                slug: order.event.slug,
                start: order.event.start,
                end: order.event.end,
              }
            : null,
          // Only show ticket count, not details
          ticketCount: order.tickets?.length || 0,
        },
      })
    }

    // Full access - return all details
    return ctx.send({
      data: {
        documentId: order.documentId,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        purchaserName: order.purchaserName,
        purchaserEmail: order.purchaserEmail,
        paidAt: order.paidAt,
        refundedAt: order.refundedAt,
        refundAmount: order.refundAmount,
        event: order.event,
        tickets: order.tickets?.map((t: any) => ({
          documentId: t.documentId,
          ticketCode: t.ticketCode,
          ticketStatus: t.ticketStatus,
          attendeeName: t.attendeeName,
          attendeeEmail: t.attendeeEmail,
          ticketType: t.ticketType?.name,
          checkedInAt: t.checkedInAt,
        })),
      },
    })
  },

  /**
   * Get current user's ticket orders
   */
  async getMyOrders(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)

    // Find orders by email or player
    const filters: any = {
      $or: [{ purchaserEmail: user.email }],
    }

    if (player) {
      filters.$or.push({ player: { id: player.id } })
    }

    const orders = await strapi.documents("api::ticket-order.ticket-order").findMany({
      filters,
      populate: {
        event: {
          fields: ["documentId", "name", "slug", "start", "end"],
          populate: {
            defaultImage: { fields: ["url", "width", "height"] },
            location: { fields: ["name"] },
          },
        },
        tickets: {
          fields: ["ticketCode", "ticketStatus"],
        },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: orders.map((o: any) => ({
        documentId: o.documentId,
        orderNumber: o.orderNumber,
        status: o.status, // This is order status, not ticket status
        totalAmount: o.totalAmount,
        currency: o.currency,
        paidAt: o.paidAt,
        event: o.event,
        ticketCount: o.tickets?.length || 0,
      })),
    })
  },

  /**
   * Request refund for an order
   */
  async requestRefund(ctx) {
    const user = ctx.state.user
    const { orderId } = ctx.params
    const { reason } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)

    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
      populate: {
        player: true,
        event: {
          populate: {
            hosts: { fields: ["id"] },
            mentors: { fields: ["id"] },
          },
        },
        tickets: true,
      },
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    if (order.status !== "paid") {
      return ctx.badRequest("Only paid orders can be refunded")
    }

    // Verify ownership or organizer status
    const isOwner =
      order.purchaserEmail === user.email || (player && order.player?.id === player.id)

    const isOrganizer =
      player &&
      (order.event?.hosts?.some((h: any) => h.id === player.id) ||
        order.event?.mentors?.some((m: any) => m.id === player.id))

    if (!isOwner && !isOrganizer) {
      return ctx.forbidden("Access denied")
    }

    if (!order.providerOrderId) {
      return ctx.badRequest("Cannot process refund - no payment reference found")
    }

    try {
      // Process refund through Stripe
      const provider = getPaymentProvider("stripe")
      const refund = await provider.processRefund({
        providerOrderId: order.providerOrderId,
        reason,
      })

      // Update order status
      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: orderId,
        data: {
          status: "refunded",
          refundedAt: new Date().toISOString(),
          refundAmount: refund.amount,
          refundReason: reason || null,
        } as any,
      })

      // Update all tickets to refunded
      for (const ticket of order.tickets || []) {
        await strapi.documents("api::ticket.ticket").update({
          documentId: ticket.documentId,
          data: { status: "refunded" } as any,
        })
      }

      // Remove player from event attendees if they were added
      if (order.player) {
        const playerDoc = await strapi.documents("api::player.player").findOne({
          documentId: order.player.documentId,
          populate: { attended: { fields: ["id", "documentId"] } },
        })

        if (playerDoc) {
          const updatedAttended = (playerDoc.attended || []).filter(
            (e: any) => e.documentId !== order.event.documentId
          )

          await strapi.documents("api::player.player").update({
            documentId: order.player.documentId,
            data: {
              attended: updatedAttended.map((e: any) => e.id),
            } as any,
          })
        }
      }

      strapi.log.info(
        `[Ticketing] Order ${order.orderNumber} refunded: ${order.currency} ${refund.amount}`
      )

      return ctx.send({
        data: {
          refundId: refund.refundId,
          amount: refund.amount,
          status: refund.status,
        },
      })
    } catch (error: any) {
      strapi.log.error(`[Ticketing] Refund failed for order ${orderId}: ${error.message}`)
      return ctx.internalServerError("Failed to process refund")
    }
  },

  /**
   * Cancel a pending order (when user abandons checkout)
   * Requires authentication and ownership verification to prevent unauthorized cancellation
   */
  async cancelOrder(ctx) {
    const { orderId } = ctx.params
    const user = ctx.state.user

    // Require authentication for cancellation
    if (!user) {
      return ctx.unauthorized("You must be logged in to cancel an order")
    }

    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
      populate: {
        player: { fields: ["id", "documentId"] },
        event: {
          fields: ["id", "documentId"],
          populate: {
            hosts: { fields: ["id"] },
            mentors: { fields: ["id"] },
          },
        },
        discountCode: { fields: ["documentId", "code"] },
      },
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    // Verify ownership or organizer status
    const player = await this.getLinkedPlayer(user.id)
    const isOwner =
      order.purchaserEmail === user.email || (player && order.player?.id === player.id)

    const isOrganizer =
      player &&
      (order.event?.hosts?.some((h: any) => h.id === player.id) ||
        order.event?.mentors?.some((m: any) => m.id === player.id))

    if (!isOwner && !isOrganizer) {
      return ctx.forbidden("Access denied - you can only cancel your own orders")
    }

    // Only pending or draft orders can be cancelled this way
    if (order.status !== "pending" && order.status !== "draft") {
      return ctx.badRequest("Only pending or draft orders can be cancelled")
    }

    // Release any ticket reservations before cancelling
    // (only pending orders have reservations, draft orders don't)
    if (order.status === "pending") {
      await releaseReservations(strapi, orderId)

      // Release any discount code reservation
      if (order.discountCode?.documentId) {
        await releaseDiscountCode(strapi, order.discountCode.documentId)
        strapi.log.info(
          `[Ticketing] Released discount code reservation for ${order.discountCode.code}`
        )
      }
    }

    // Update order status to cancelled
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: orderId,
      data: { status: "cancelled" } as any,
    })

    strapi.log.info(`[Ticketing] Order ${order.orderNumber} cancelled by user ${user.email}`)

    return ctx.send({
      data: { success: true },
    })
  },

  // ============================================================================
  // DRAFT ORDER FLOW - Multi-step checkout with attendee information collection
  // ============================================================================

  /**
   * Create a draft order to collect attendee information
   * Does NOT create Stripe session yet - that happens in finalizeCheckout
   */
  async createDraftOrder(ctx) {
    const user = ctx.state.user

    // Require authentication
    if (!user) {
      return ctx.unauthorized("You must be logged in to purchase tickets")
    }

    // Require linked player profile
    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a player profile to purchase tickets", {
        details: { code: "PLAYER_REQUIRED" },
      })
    }

    // RATE LIMITING: Limit draft orders per user to prevent abuse
    // Uses a time-based window (last hour) to prevent rapid-fire creation
    // Combined with cron job that cleans up drafts older than 24 hours
    // Limits can be configured via TICKETING_MAX_PENDING_DRAFTS and TICKETING_MAX_DRAFTS_PER_HOUR env vars

    // Check total pending draft orders (regardless of age)
    const existingDrafts = await strapi.documents("api::ticket-order.ticket-order").findMany({
      filters: {
        player: { id: player.id },
        status: "draft",
      },
      limit: ORDER_LIMITS.MAX_PENDING_DRAFTS + 1,
    })

    if (existingDrafts.length >= ORDER_LIMITS.MAX_PENDING_DRAFTS) {
      return ctx.badRequest(
        `You have too many pending orders. Please complete or cancel existing orders before creating new ones. (Maximum: ${ORDER_LIMITS.MAX_PENDING_DRAFTS})`,
        { details: { code: "RATE_LIMITED", maxDrafts: ORDER_LIMITS.MAX_PENDING_DRAFTS } }
      )
    }

    // Check time-based rate: limit orders created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentOrders = await strapi.documents("api::ticket-order.ticket-order").findMany({
      filters: {
        player: { id: player.id },
        createdAt: { $gt: oneHourAgo.toISOString() },
      },
      limit: ORDER_LIMITS.MAX_DRAFTS_PER_HOUR + 1,
    })

    if (recentOrders.length >= ORDER_LIMITS.MAX_DRAFTS_PER_HOUR) {
      return ctx.badRequest(
        "You have created too many orders recently. Please wait before creating new orders.",
        { details: { code: "RATE_LIMITED_TIME", maxPerHour: ORDER_LIMITS.MAX_DRAFTS_PER_HOUR } }
      )
    }

    const { eventId, tickets, discountCode: discountCodeString } = ctx.request.body?.data || {}

    if (!eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return ctx.badRequest("Event ID and tickets array are required")
    }

    // Validate ticket request structure
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      if (!ticket || typeof ticket !== "object") {
        return ctx.badRequest(`Ticket ${i + 1}: Invalid ticket object`)
      }
      if (!ticket.ticketTypeId || typeof ticket.ticketTypeId !== "string") {
        return ctx.badRequest(`Ticket ${i + 1}: ticketTypeId is required and must be a string`)
      }
      if (
        ticket.quantity === undefined ||
        typeof ticket.quantity !== "number" ||
        !Number.isInteger(ticket.quantity) ||
        ticket.quantity < 1 ||
        ticket.quantity > 100
      ) {
        return ctx.badRequest(`Ticket ${i + 1}: quantity must be a positive integer (1-100)`)
      }
    }

    // Use player data for purchaser info
    const email = user.email
    const name = player.name || user.username

    if (!email) {
      return ctx.badRequest("User email is required")
    }
    if (!name) {
      return ctx.badRequest("Player name is required")
    }

    // Fetch event with ticket types
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        ticketTypes: true,
        players: { fields: ["id"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    if (event.ticketingMode !== "internal") {
      return ctx.badRequest("Internal ticketing is not enabled for this event")
    }

    if (event.eventStatus !== "Open") {
      return ctx.badRequest("Event is not open for registration")
    }

    // Validate tickets and calculate total
    let originalAmount = 0
    let totalQuantity = 0
    const ticketDetails: Array<{
      ticketTypeId: string
      ticketTypeName: string
      quantity: number
      unitPrice: number
      currency: string
    }> = []

    const now = new Date()

    for (const ticketRequest of tickets) {
      const ticketType = (event.ticketTypes || []).find(
        (tt: any) => tt.documentId === ticketRequest.ticketTypeId
      )

      if (!ticketType) {
        return ctx.badRequest(`Invalid ticket type: ${ticketRequest.ticketTypeId}`)
      }

      if (!ticketType.isActive) {
        return ctx.badRequest(`Ticket type ${ticketType.name} is not available`)
      }

      if (ticketType.validFrom && new Date(ticketType.validFrom) > now) {
        return ctx.badRequest(`Ticket type ${ticketType.name} is not yet available`)
      }

      if (ticketType.validUntil && new Date(ticketType.validUntil) < now) {
        return ctx.badRequest(`Ticket type ${ticketType.name} has expired`)
      }

      // Check ticket type capacity (includes reserved tickets)
      // Available = capacity - sold - reserved
      const effectiveUsed = (ticketType.soldCount || 0) + (ticketType.reservedCount || 0)
      const available = ticketType.capacity
        ? ticketType.capacity - effectiveUsed
        : Number.POSITIVE_INFINITY

      if (ticketRequest.quantity > available) {
        return ctx.badRequest(
          `Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`
        )
      }

      originalAmount += ticketType.price * ticketRequest.quantity
      totalQuantity += ticketRequest.quantity

      ticketDetails.push({
        ticketTypeId: ticketType.documentId,
        ticketTypeName: ticketType.name,
        quantity: ticketRequest.quantity,
        unitPrice: ticketType.price,
        currency: ticketType.currency,
      })
    }

    // Apply discount code if provided
    let discountAmount = 0
    let appliedDiscountCode: { id: number; documentId: string; code: string } | null = null

    if (discountCodeString) {
      const discountResult = await this.validateAndApplyDiscount(
        eventId,
        discountCodeString,
        originalAmount
      )

      if ("error" in discountResult) {
        return ctx.badRequest(discountResult.error)
      }

      discountAmount = discountResult.discountAmount
      appliedDiscountCode = {
        id: discountResult.id,
        documentId: discountResult.documentId,
        code: discountResult.code,
      }
    }

    const totalAmount = originalAmount - discountAmount

    // Create draft order (NOT pending - no Stripe session yet)
    // NOTE: Draft orders do NOT create reservations - that happens in finalizeCheckout()
    const orderNumber = generateOrderNumber()
    const currency = ticketDetails[0]?.currency || "EUR"

    const order = await strapi.documents("api::ticket-order.ticket-order").create({
      data: {
        orderNumber,
        status: "draft",
        originalAmount,
        discountAmount,
        totalAmount,
        currency,
        paymentProvider: "stripe",
        purchaserEmail: email,
        purchaserName: name,
        ticketDetails,
        player: player.id,
        event: event.id,
        discountCode: appliedDiscountCode?.id || null,
        // Initialize empty attendee details
        attendeeDetails: [],
      } as any,
    })

    // Parse player name for defaults
    const nameParts = name.split(" ")
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    strapi.log.info(
      `[Ticketing] Draft order ${orderNumber} created for event ${event.name} - ${totalQuantity} tickets`
    )

    return ctx.send({
      data: {
        orderId: order.documentId,
        orderNumber,
        ticketCount: totalQuantity,
        ticketDetails,
        totalAmount,
        originalAmount,
        discountAmount,
        currency,
        requiresAttendeeInfo: true,
        // Pre-fill with player defaults
        playerDefaults: {
          email,
          firstName,
          lastName,
          defaultTshirtSize: player.defaultTshirtSize || "none",
          defaultFoodPreferences: player.defaultFoodPreferences || "",
        },
      },
    })
  },

  /**
   * Update attendee information for a draft order
   */
  async updateAttendeeInfo(ctx) {
    const user = ctx.state.user
    const { orderId } = ctx.params
    const { attendees, gdprConsent, termsAccepted } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a player profile")
    }

    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
      populate: { player: true, event: true },
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    if (order.status !== "draft") {
      return ctx.badRequest("Order is not in draft status")
    }

    // Verify ownership
    if (order.player?.id !== player.id) {
      return ctx.forbidden("Access denied")
    }

    // Validate attendee data
    const ticketDetails = (order as any).ticketDetails || []
    const expectedCount = ticketDetails.reduce((sum: number, t: any) => sum + t.quantity, 0)

    if (!Array.isArray(attendees) || attendees.length !== expectedCount) {
      return ctx.badRequest(`Expected ${expectedCount} attendees, got ${attendees?.length || 0}`)
    }

    // Validate each attendee using the validation library
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i]

      // Validate attendee object structure
      if (!attendee || typeof attendee !== "object") {
        return ctx.badRequest(`Attendee ${i + 1}: Invalid attendee object`)
      }

      if (!attendee.email || !attendee.firstName || !attendee.lastName) {
        return ctx.badRequest(`Attendee ${i + 1}: Email, first name, and last name are required`)
      }

      // Validate field types
      if (
        typeof attendee.email !== "string" ||
        typeof attendee.firstName !== "string" ||
        typeof attendee.lastName !== "string"
      ) {
        return ctx.badRequest(`Attendee ${i + 1}: Email, first name, and last name must be strings`)
      }

      // Validate first name using the validation library
      const firstNameResult = validateName(attendee.firstName, {
        minLength: 1,
        maxLength: 50,
        field: "First name",
      })
      if (!firstNameResult.valid) {
        return ctx.badRequest(`Attendee ${i + 1}: ${firstNameResult.error}`)
      }

      // Validate last name using the validation library
      const lastNameResult = validateName(attendee.lastName, {
        minLength: 1,
        maxLength: 50,
        field: "Last name",
      })
      if (!lastNameResult.valid) {
        return ctx.badRequest(`Attendee ${i + 1}: ${lastNameResult.error}`)
      }

      // Validate email using the validation library (handles RFC 5322, IDN, plus addressing, etc.)
      const emailResult = validateEmail(attendee.email)
      if (!emailResult.valid) {
        return ctx.badRequest(`Attendee ${i + 1}: ${emailResult.error}`)
      }

      // Validate optional fields if present
      if (attendee.tshirtSize !== undefined && typeof attendee.tshirtSize !== "string") {
        return ctx.badRequest(`Attendee ${i + 1}: T-shirt size must be a string`)
      }
      if (attendee.foodPreferences !== undefined && typeof attendee.foodPreferences !== "string") {
        return ctx.badRequest(`Attendee ${i + 1}: Food preferences must be a string`)
      }
      // Sanitize foodPreferences to strip HTML/script tags (XSS prevention)
      if (attendee.foodPreferences) {
        attendee.foodPreferences = sanitizeText(attendee.foodPreferences)
        if (attendee.foodPreferences.length > 500) {
          return ctx.badRequest(
            `Attendee ${i + 1}: Food preferences must be at most 500 characters`
          )
        }
      }
      if (attendee.photoConsent !== undefined && typeof attendee.photoConsent !== "boolean") {
        return ctx.badRequest(`Attendee ${i + 1}: Photo consent must be a boolean`)
      }
    }

    // GDPR and Terms consent required
    if (!gdprConsent) {
      return ctx.badRequest("GDPR consent is required to proceed")
    }

    if (!termsAccepted) {
      return ctx.badRequest("You must accept the Terms of Sale to proceed")
    }

    const now = new Date().toISOString()

    // Update order with attendee details and consents
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: orderId,
      data: {
        attendeeDetails: attendees,
        gdprConsent: true,
        gdprConsentTimestamp: now,
        termsAccepted: true,
        termsAcceptedTimestamp: now,
      } as any,
    })

    strapi.log.info(`[Ticketing] Attendee info saved for order ${order.orderNumber}`)

    return ctx.send({
      data: { success: true, readyForCheckout: true },
    })
  },

  /**
   * Finalize a draft order and create Stripe checkout session
   */
  async finalizeCheckout(ctx) {
    const user = ctx.state.user
    const { orderId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a player profile")
    }

    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
      populate: {
        player: true,
        event: {
          populate: {
            stripeAccount: true,
            ticketTypes: true,
          },
        },
        discountCode: true,
      },
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    if (order.status !== "draft") {
      return ctx.badRequest("Order is not in draft status")
    }

    // Verify ownership
    if (order.player?.id !== player.id) {
      return ctx.forbidden("Access denied")
    }

    // Verify attendee info is complete
    const attendeeDetails = (order as any).attendeeDetails || []
    const ticketDetails = (order as any).ticketDetails || []
    const expectedCount = ticketDetails.reduce((sum: number, t: any) => sum + t.quantity, 0)

    if (attendeeDetails.length !== expectedCount) {
      return ctx.badRequest("Attendee information is incomplete")
    }

    // Verify consents
    if (!(order as any).gdprConsent) {
      return ctx.badRequest("GDPR consent is required")
    }

    if (!(order as any).termsAccepted) {
      return ctx.badRequest("Terms acceptance is required")
    }

    // Re-validate ticket availability (may have sold out while filling form)
    // NOTE: Reservations are only created when moving to pending, so availability
    // check here includes reserved tickets from other users' active checkouts
    const event = order.event as any
    for (const detail of ticketDetails) {
      const ticketType = (event.ticketTypes || []).find(
        (tt: any) => tt.documentId === detail.ticketTypeId
      )

      if (!ticketType) {
        return ctx.badRequest(`Ticket type ${detail.ticketTypeName} is no longer available`)
      }

      // Available = capacity - sold - reserved
      const effectiveUsed = (ticketType.soldCount || 0) + (ticketType.reservedCount || 0)
      const available = ticketType.capacity
        ? ticketType.capacity - effectiveUsed
        : Number.POSITIVE_INFINITY

      if (detail.quantity > available) {
        return ctx.badRequest(
          `Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`
        )
      }
    }

    // Handle free orders (no Stripe needed)
    // SECURITY: Use atomic sellTicketsAtomic to prevent overselling via race condition
    if ((order as any).totalAmount === 0) {
      // Re-validate and atomically use the discount code if one was applied
      // (for free orders, we validate + use in one atomic operation since there's no payment flow)
      // This prevents TOCTOU where the discount code became unavailable since draft creation
      if (order.discountCode?.documentId) {
        const discountResult = await useDiscountCodeAtomic(
          strapi,
          event.documentId,
          order.discountCode.code,
          (order as any).originalAmount
        )
        if (!discountResult.success) {
          strapi.log.warn(
            `[Ticketing] Discount code validation failed for free order ${order.orderNumber}: ${discountResult.error}`
          )
          return ctx.badRequest(discountResult.error || "Discount code is no longer available")
        }
      }

      // Atomically update soldCount with capacity check to prevent overselling
      const sellResult = await sellTicketsAtomic(strapi, ticketDetails)

      if (!sellResult.success) {
        strapi.log.warn(`[Ticketing] Free order ${order.orderNumber} failed: ${sellResult.error}`)
        return ctx.badRequest(sellResult.error || "Failed to complete free order")
      }

      // Update order to paid immediately
      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: orderId,
        data: {
          status: "paid",
          paidAt: new Date().toISOString(),
        } as any,
      })

      strapi.log.info(`[Ticketing] Free order ${order.orderNumber} completed`)

      // Trigger ticket creation (normally done by webhook)
      await this.processCompletedOrder(order)

      return ctx.send({
        data: {
          free: true,
          orderId: order.documentId,
          orderNumber: order.orderNumber,
        },
      })
    }

    // Create Stripe checkout session
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"

    // IMPORTANT: Reserve discount code BEFORE creating Stripe session to prevent race condition.
    // If we created the session first and discount reservation failed, the session would be orphaned.
    let discountCodeReserved = false
    if (order.discountCode?.documentId) {
      const discountReservation = await reserveDiscountCode(
        strapi,
        event.documentId,
        order.discountCode.code,
        (order as any).originalAmount
      )

      if (!discountReservation.success) {
        // Discount code is no longer valid - fail checkout before creating Stripe session
        strapi.log.warn(
          `[Ticketing] Discount code reservation failed for order ${order.orderNumber}: ${discountReservation.error}`
        )
        return ctx.badRequest(discountReservation.error || "Discount code is no longer available")
      }
      discountCodeReserved = true
    }

    // Track what resources have been allocated for cleanup on error
    let orderUpdatedToPending = false
    let reservationsCreated = false

    try {
      const provider = getPaymentProvider("stripe") as ConnectPaymentProvider

      // Build line items from ticket details
      const lineItems = ticketDetails.map((detail: any) => ({
        name: `${event.name} - ${detail.ticketTypeName}`,
        unitPrice: detail.unitPrice,
        quantity: detail.quantity,
      }))

      // Check if event has a connected Stripe account
      const connectedAccountId = event.stripeAccount?.stripeAccountId
      const accountIsActive = event.stripeAccount?.accountStatus === "active"

      let session

      if (connectedAccountId && accountIsActive) {
        // Use destination charges
        const platformFeePercent = Number.parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "0")
        const applicationFeeAmount = Math.round(
          (order as any).totalAmount * 100 * (platformFeePercent / 100)
        )

        session = await provider.createCheckoutSessionWithConnect({
          orderId: order.documentId,
          lineItems,
          currency: (order as any).currency,
          customerEmail: (order as any).purchaserEmail,
          successUrl: `${frontendUrl}/events/${event.slug}/tickets/success?order=${order.documentId}`,
          cancelUrl: `${frontendUrl}/events/${event.slug}/tickets/cancelled?order=${order.documentId}`,
          metadata: {
            eventId: event.documentId,
            eventSlug: event.slug,
          },
          connectedAccountId,
          applicationFeeAmount,
        })

        strapi.log.info(`[Ticketing] Using Stripe Connect for order ${order.orderNumber}`)
      } else {
        // Fallback to platform account
        session = await provider.createCheckoutSession({
          orderId: order.documentId,
          lineItems,
          currency: (order as any).currency,
          customerEmail: (order as any).purchaserEmail,
          successUrl: `${frontendUrl}/events/${event.slug}/tickets/success?order=${order.documentId}`,
          cancelUrl: `${frontendUrl}/events/${event.slug}/tickets/cancelled?order=${order.documentId}`,
          metadata: {
            eventId: event.documentId,
            eventSlug: event.slug,
          },
        })
      }

      // Update order to pending with session info
      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: order.documentId,
        data: {
          status: "pending",
          providerSessionId: session.sessionId,
        } as any,
      })
      orderUpdatedToPending = true

      // Create reservations for the tickets
      const ticketRequests = ticketDetails.map((detail: any) => ({
        ticketTypeId: detail.ticketTypeId,
        quantity: detail.quantity,
      }))

      const reservationResult = await createReservations(
        strapi,
        order.documentId,
        ticketRequests,
        getReservationExpiry(session.expiresAt)
      )

      if (!reservationResult.success) {
        // Reservation failed - will be cleaned up in finally-like block below
        throw new Error(reservationResult.error || "Failed to reserve tickets")
      }
      reservationsCreated = true

      strapi.log.info(`[Ticketing] Checkout session created for order ${order.orderNumber}`)

      return ctx.send({
        data: {
          checkoutUrl: session.sessionUrl,
          expiresAt: session.expiresAt,
        },
      })
    } catch (error: any) {
      // Clean up all allocated resources in reverse order
      strapi.log.error(`[Ticketing] Failed to create checkout session: ${error.message}`)

      // Release reservations if they were created
      if (reservationsCreated) {
        try {
          await releaseReservations(strapi, order.documentId)
          strapi.log.info(
            `[Ticketing] Released reservations for order ${order.orderNumber} after error`
          )
        } catch (releaseError: any) {
          strapi.log.error(`[Ticketing] Failed to release reservations: ${releaseError.message}`)
        }
      }

      // Revert order status if it was updated to pending
      if (orderUpdatedToPending) {
        try {
          await strapi.documents("api::ticket-order.ticket-order").update({
            documentId: order.documentId,
            data: {
              status: "draft",
              providerSessionId: null,
            } as any,
          })
        } catch (revertError: any) {
          strapi.log.error(`[Ticketing] Failed to revert order status: ${revertError.message}`)
        }
      }

      // Release the discount code reservation
      if (discountCodeReserved && order.discountCode?.documentId) {
        try {
          await releaseDiscountCode(strapi, order.discountCode.documentId)
        } catch (discountError: any) {
          strapi.log.error(`[Ticketing] Failed to release discount code: ${discountError.message}`)
        }
      }

      // Return appropriate error
      if (
        error.message?.includes("Failed to reserve tickets") ||
        error.message?.includes("Not enough")
      ) {
        return ctx.badRequest(error.message)
      }
      return ctx.internalServerError("Failed to create payment session")
    }
  },

  /**
   * Process a completed order (create tickets, players, send emails)
   * Called after payment or for free orders
   */
  async processCompletedOrder(orderInput: any) {
    // Re-fetch order with full population needed for ticket creation
    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderInput.documentId,
      populate: {
        event: {
          fields: [
            "id",
            "documentId",
            "name",
            "slug",
            "start",
            "end",
            "contactEmail",
            "description",
            "eventStatus",
          ],
          populate: {
            ticketTypes: true,
            location: { fields: ["name", "country"] },
            venue: { fields: ["name", "website", "location"] },
          },
        },
        player: true,
        discountCode: true,
      },
    })

    if (!order) {
      strapi.log.error(`[Ticketing] Order not found for processing: ${orderInput.documentId}`)
      return
    }

    strapi.log.info(`[Ticketing] Processing completed order ${order.orderNumber}`)

    const ticketDetails = order.ticketDetails || []
    const attendeeDetails = ((order as any).attendeeDetails || []) as AttendeeInfo[]

    // Track created tickets for confirmation email
    const createdTickets: Array<{
      ticketCode: string
      ticketTypeName: string
      attendeeName: string
      attendeeEmail: string
      player: any
      isNewPlayer: boolean
    }> = []

    // Create tickets - use attendee details if available, otherwise fall back to purchaser info
    let ticketIndex = 0
    for (const detail of ticketDetails as any[]) {
      const ticketType = (order.event as any)?.ticketTypes?.find(
        (tt: any) => tt.documentId === detail.ticketTypeId
      )

      if (!ticketType) {
        strapi.log.warn(`[Ticketing] Ticket type not found: ${detail.ticketTypeId}`)
        continue
      }

      // Create individual tickets
      for (let i = 0; i < detail.quantity; i++) {
        // Get attendee info for this ticket (if available)
        const attendee = attendeeDetails[ticketIndex]
        let attendeeName: string
        let attendeeEmail: string
        let attendeeInfo: any = null
        let ticketPlayer: any = null
        let isNewPlayer = false

        if (attendee) {
          // Use collected attendee information
          attendeeName = `${attendee.firstName} ${attendee.lastName}`
          attendeeEmail = attendee.email

          // Build attendeeInfo component data
          attendeeInfo = {
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            email: attendee.email,
            tshirtSize: attendee.tshirtSize || "none",
            foodPreferences: attendee.foodPreferences || null,
            photoConsent: attendee.photoConsent,
            photoConsentTimestamp: attendee.photoConsentTimestamp || null,
          }

          // Find or create player for this attendee
          const playerResult = await this.findOrCreatePlayerForAttendee(
            attendee,
            order.player,
            order.event
          )
          ticketPlayer = playerResult.player
          isNewPlayer = playerResult.isNew
        } else {
          // Fall back to purchaser info (legacy behavior)
          attendeeName = order.purchaserName
          attendeeEmail = order.purchaserEmail
          ticketPlayer = order.player
        }

        const ticket = await strapi.documents("api::ticket.ticket").create({
          data: {
            ticketCode: generateTicketCode(),
            ticketStatus: "valid",
            attendeeName,
            attendeeEmail,
            attendeeInfo,
            ticketType: ticketType.id,
            order: order.id,
            player: ticketPlayer?.id || null,
            event: (order.event as any).id,
          } as any,
        })

        createdTickets.push({
          ticketCode: ticket.ticketCode,
          ticketTypeName: ticketType.name,
          attendeeName,
          attendeeEmail,
          player: ticketPlayer,
          isNewPlayer,
        })

        ticketIndex++
      }
    }

    // Add all ticket players to event attendees
    const playersToAddToEvent = new Set<string>()
    for (const ticket of createdTickets) {
      if (ticket.player?.documentId) {
        playersToAddToEvent.add(ticket.player.documentId)
      }
    }

    for (const playerDocId of playersToAddToEvent) {
      await this.addPlayerToEvent(playerDocId, order.event)
    }

    // Send confirmation email to purchaser
    await sendOrderConfirmationEmail(strapi, order, createdTickets)

    // Send invitation emails to new players (attendees who got a new profile created)
    for (const ticket of createdTickets) {
      if (ticket.isNewPlayer && ticket.player) {
        // Don't send invitation to purchaser (they already got confirmation email)
        if (ticket.attendeeEmail.toLowerCase() !== order.purchaserEmail.toLowerCase()) {
          await sendPlayerInvitationEmail(
            strapi,
            ticket.attendeeEmail,
            ticket.attendeeName,
            ticket.player,
            ticket.ticketCode,
            order.event
          )
        }
      }
    }

    // Notify event organizers about the sale
    await sendTicketSoldNotificationEmail(strapi, order, createdTickets)

    strapi.log.info(
      `[Ticketing] Order ${order.orderNumber} processed successfully with ${createdTickets.length} tickets`
    )
  },

  /**
   * Find or create a player profile for an attendee
   * Delegates to the shared player service
   */
  async findOrCreatePlayerForAttendee(
    attendee: AttendeeInfo,
    purchaserPlayer: any,
    _event: any
  ): Promise<{ player: any; isNew: boolean }> {
    return findOrCreatePlayerService(strapi, attendee, purchaserPlayer, "[Ticketing]")
  },

  /**
   * Add a player to an event's attendees list
   * Delegates to the shared player service
   */
  async addPlayerToEvent(playerDocumentId: string, event: any) {
    return addPlayerToEventAttendees(strapi, playerDocumentId, event, "[Ticketing]")
  },

  /**
   * Download invoice PDF for a paid order
   * SECURITY: Requires authentication and ownership (purchaser or event organizer)
   */
  async downloadInvoice(ctx) {
    const { orderId } = ctx.params
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in to download invoices")
    }

    // Fetch order with all data needed for invoice
    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
      populate: {
        event: {
          fields: ["documentId", "name", "slug", "start", "end", "contactEmail"],
          populate: {
            location: { fields: ["name", "country"] },
            venue: { fields: ["name"] },
            hosts: { fields: ["id"] },
            mentors: { fields: ["id"] },
          },
        },
        player: { fields: ["id", "documentId", "name"] },
        tickets: {
          populate: {
            ticketType: { fields: ["name", "price", "currency"] },
          },
        },
      },
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    // Check authorization: owner or event organizer
    const player = await this.getLinkedPlayer(user.id)
    const isOwner =
      order.purchaserEmail === user.email || (player && order.player?.id === player.id)

    let isOrganizer = false
    if (!isOwner && player) {
      const event = order.event as any
      isOrganizer =
        event?.hosts?.some((h: any) => h.id === player.id) ||
        event?.mentors?.some((m: any) => m.id === player.id)
    }

    if (!isOwner && !isOrganizer) {
      return ctx.forbidden("You are not authorized to download this invoice")
    }

    // Only paid orders can have invoices
    if (order.status !== "paid" && order.status !== "refunded") {
      return ctx.badRequest("Invoice is only available for paid orders")
    }

    // Build invoice data
    const event = order.event as any
    const locationName = event?.location?.name || ""
    const venueName = event?.venue?.name || ""
    const eventLocation = [venueName, locationName].filter(Boolean).join(", ") || "TBD"

    // Group tickets by type for invoice line items
    const ticketsByType = new Map<
      string,
      { name: string; price: number; currency: string; quantity: number }
    >()
    for (const ticket of (order.tickets || []) as any[]) {
      const typeName = ticket.ticketType?.name || "Ticket"
      const existing = ticketsByType.get(typeName)
      if (existing) {
        existing.quantity += 1
      } else {
        ticketsByType.set(typeName, {
          name: typeName,
          price: ticket.ticketType?.price || 0,
          currency: ticket.ticketType?.currency || order.currency,
          quantity: 1,
        })
      }
    }

    const ticketItems = Array.from(ticketsByType.values()).map((item) => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    }))

    const subtotal = ticketItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const discountAmount = subtotal - order.totalAmount

    const invoiceData: InvoiceData = {
      orderNumber: order.orderNumber,
      invoiceNumber: order.orderNumber,
      invoiceDate: order.paidAt || order.createdAt,
      purchaserName: order.purchaserName,
      purchaserEmail: order.purchaserEmail,
      eventName: event?.name || "Event",
      eventDate: event?.start
        ? new Date(event.start).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBD",
      eventLocation,
      tickets: ticketItems,
      subtotal,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentMethod: "Stripe",
      notes: order.status === "refunded" ? "This order has been refunded." : undefined,
    }

    // Logo path - anchor to app root so it works in both src and dist builds
    const logoPath = join(process.cwd(), "public/images/play14_600x200_transparent-light.png")

    try {
      const pdfBuffer = await generateInvoicePDF(invoiceData, {
        organizationName: "#play14",
        organizationWebsite: "https://play14.org",
        organizationEmail: event?.contactEmail || "team@play14.org",
        logoPath,
      })

      // Set response headers for PDF download
      ctx.set("Content-Type", "application/pdf")
      ctx.set("Content-Disposition", `attachment; filename="invoice-${order.orderNumber}.pdf"`)
      ctx.set("Content-Length", pdfBuffer.length.toString())

      ctx.body = pdfBuffer
    } catch (error: any) {
      strapi.log.error(
        `[Invoice] Failed to generate invoice for order ${order.orderNumber}: ${error.message}`
      )
      return ctx.internalServerError("Failed to generate invoice")
    }
  },
})
