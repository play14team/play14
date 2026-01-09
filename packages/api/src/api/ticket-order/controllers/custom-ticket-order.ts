/**
 * Custom controller for ticket order management
 * Handles ticket purchase flow, order status, and refunds
 */

import type { Core } from "@strapi/strapi"
import { generateOrderNumber, generateTicketCode } from "../../../libs/tickets"
import { getPaymentProvider } from "../../../services/payment"
import type { ConnectPaymentProvider } from "../../../services/payment/types"
import {
  createReservations,
  releaseReservations,
  getReservationExpiry,
} from "../../../services/ticketing"

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
  ): Promise<{ id: number; documentId: string; code: string; discountAmount: number } | { error: string }> {
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

    // Use player/user data for purchaser info
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
    const lineItems: Array<{ name: string; description?: string; unitPrice: number; quantity: number }> = []
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
      const available = ticketType.capacity ? ticketType.capacity - effectiveUsed : Infinity

      if (ticketRequest.quantity > available) {
        return ctx.badRequest(`Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`)
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

    // Apply discount code if provided
    let discountAmount = 0
    let appliedDiscountCode: { id: number; documentId: string; code: string } | null = null

    if (discountCodeString) {
      const discountResult = await this.validateAndApplyDiscount(eventId, discountCodeString, originalAmount)

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
        const platformFeePercent = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "0")
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
        // Reservation failed - clean up and return error
        await strapi.documents("api::ticket-order.ticket-order").delete({
          documentId: order.documentId,
        })
        strapi.log.warn(`[Ticketing] Reservation failed for order ${orderNumber}: ${reservationResult.error}`)
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
      // Clean up the order if Stripe session creation fails
      await strapi.documents("api::ticket-order.ticket-order").delete({
        documentId: order.documentId,
      })

      strapi.log.error(`[Ticketing] Failed to create checkout session: ${error.message}`)
      return ctx.internalServerError("Failed to create payment session")
    }
  },

  /**
   * Get order status and details
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

    // For authenticated users, verify they can access this order
    if (user) {
      const player = await this.getLinkedPlayer(user.id)
      const isOwner =
        order.purchaserEmail === user.email || (player && order.player?.id === player.id)

      if (!isOwner) {
        // Allow if user is a host/mentor of the event
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

        if (!isOrganizer) {
          return ctx.forbidden("Access denied")
        }
      }
    }

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
        status: o.status,  // This is order status, not ticket status
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
   */
  async cancelOrder(ctx) {
    const { orderId } = ctx.params

    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: orderId,
    })

    if (!order) {
      return ctx.notFound("Order not found")
    }

    // Only pending or draft orders can be cancelled this way
    if (order.status !== "pending" && order.status !== "draft") {
      return ctx.badRequest("Only pending or draft orders can be cancelled")
    }

    // Release any ticket reservations before cancelling
    // (only pending orders have reservations, draft orders don't)
    if (order.status === "pending") {
      await releaseReservations(strapi, orderId)
    }

    // Update order status to cancelled
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: orderId,
      data: { status: "cancelled" } as any,
    })

    strapi.log.info(`[Ticketing] Order ${order.orderNumber} cancelled by user`)

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

    // Use player/user data for purchaser info
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
      const available = ticketType.capacity ? ticketType.capacity - effectiveUsed : Infinity

      if (ticketRequest.quantity > available) {
        return ctx.badRequest(`Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`)
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
      const discountResult = await this.validateAndApplyDiscount(eventId, discountCodeString, originalAmount)

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

    // Validate each attendee
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
      if (typeof attendee.email !== "string" || typeof attendee.firstName !== "string" || typeof attendee.lastName !== "string") {
        return ctx.badRequest(`Attendee ${i + 1}: Email, first name, and last name must be strings`)
      }

      // Sanitize and validate name length (2-50 chars each)
      const firstName = attendee.firstName.trim()
      const lastName = attendee.lastName.trim()

      if (firstName.length < 1 || firstName.length > 50) {
        return ctx.badRequest(`Attendee ${i + 1}: First name must be 1-50 characters`)
      }
      if (lastName.length < 1 || lastName.length > 50) {
        return ctx.badRequest(`Attendee ${i + 1}: Last name must be 1-50 characters`)
      }

      // Check for invalid characters (control characters)
      const invalidCharPattern = /[\x00-\x1F\x7F]/
      if (invalidCharPattern.test(firstName) || invalidCharPattern.test(lastName)) {
        return ctx.badRequest(`Attendee ${i + 1}: Name contains invalid characters`)
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(attendee.email)) {
        return ctx.badRequest(`Attendee ${i + 1}: Invalid email format`)
      }

      // Validate optional fields if present
      if (attendee.tshirtSize !== undefined && typeof attendee.tshirtSize !== "string") {
        return ctx.badRequest(`Attendee ${i + 1}: T-shirt size must be a string`)
      }
      if (attendee.foodPreferences !== undefined && typeof attendee.foodPreferences !== "string") {
        return ctx.badRequest(`Attendee ${i + 1}: Food preferences must be a string`)
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
      const available = ticketType.capacity ? ticketType.capacity - effectiveUsed : Infinity

      if (detail.quantity > available) {
        return ctx.badRequest(`Not enough tickets available for ${ticketType.name} (${Math.max(0, available)} remaining)`)
      }
    }

    // Handle free orders (no Stripe needed)
    // Free orders skip reservations and update soldCount directly
    if ((order as any).totalAmount === 0) {
      // Update soldCount directly for each ticket type (no reservation needed)
      for (const detail of ticketDetails) {
        const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
          documentId: detail.ticketTypeId,
        })
        if (ticketType) {
          await strapi.documents("api::ticket-type.ticket-type").update({
            documentId: detail.ticketTypeId,
            data: {
              soldCount: (ticketType.soldCount || 0) + detail.quantity,
            } as any,
          })
        }
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
        const platformFeePercent = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "0")
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

        strapi.log.info(
          `[Ticketing] Using Stripe Connect for order ${order.orderNumber}`
        )
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
        // Reservation failed - revert order to draft status
        await strapi.documents("api::ticket-order.ticket-order").update({
          documentId: order.documentId,
          data: {
            status: "draft",
            providerSessionId: null,
          } as any,
        })
        strapi.log.warn(`[Ticketing] Reservation failed for order ${order.orderNumber}: ${reservationResult.error}`)
        return ctx.badRequest(reservationResult.error || "Failed to reserve tickets")
      }

      strapi.log.info(
        `[Ticketing] Checkout session created for order ${order.orderNumber}`
      )

      return ctx.send({
        data: {
          checkoutUrl: session.sessionUrl,
          expiresAt: session.expiresAt,
        },
      })
    } catch (error: any) {
      strapi.log.error(`[Ticketing] Failed to create checkout session: ${error.message}`)
      return ctx.internalServerError("Failed to create payment session")
    }
  },

  /**
   * Process a completed order (create tickets, players, send emails)
   * Called after payment or for free orders
   */
  async processCompletedOrder(order: any) {
    // This will be implemented in the webhook handler
    // For free orders, we need to create tickets here
    strapi.log.info(`[Ticketing] Processing completed order ${order.orderNumber}`)
    // Ticket creation logic will be added in webhook update
  },
})
