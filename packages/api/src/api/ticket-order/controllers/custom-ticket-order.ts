/**
 * Custom controller for ticket order management
 * Handles ticket purchase flow, order status, and refunds
 */

import type { Core } from "@strapi/strapi"
import { generateOrderNumber, generateTicketCode } from "../../../libs/tickets"
import { getPaymentProvider } from "../../../services/payment"
import type { ConnectPaymentProvider } from "../../../services/payment/types"

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

    if (!event.ticketingEnabled) {
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

        return {
          documentId: tt.documentId,
          name: tt.name,
          description: tt.description,
          price: tt.price,
          currency: tt.currency,
          available: tt.capacity ? Math.max(0, tt.capacity - (tt.soldCount || 0)) : null,
          soldOut: tt.capacity ? tt.soldCount >= tt.capacity : false,
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
        paymentProvider: event.paymentProvider,
        globalCapacity: event.globalCapacity,
        ticketTypes: availableTypes,
        hasPaymentProvider: event.paymentProvider === "stripe",
      },
    })
  },

  /**
   * Get count of pending tickets for an event (used for capacity checking)
   */
  async getPendingTicketCount(eventId: string): Promise<number> {
    const pendingOrders = await strapi.documents("api::ticket-order.ticket-order").findMany({
      filters: {
        event: { documentId: eventId },
        status: "pending",
      },
    })

    // Sum up ticket quantities from ticketDetails JSON
    return pendingOrders.reduce((sum: number, order: any) => {
      const details = order.ticketDetails || []
      return sum + details.reduce((s: number, d: any) => s + (d.quantity || 0), 0)
    }, 0)
  },

  /**
   * Initiate a ticket order (creates order and returns checkout URL)
   */
  async initiateOrder(ctx) {
    const user = ctx.state.user
    const { eventId, tickets, purchaserName, purchaserEmail } = ctx.request.body?.data || {}

    if (!eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return ctx.badRequest("Event ID and tickets array are required")
    }

    // Validate purchaser info
    const email = purchaserEmail || user?.email
    const name = purchaserName || user?.username

    if (!email) {
      return ctx.badRequest("Purchaser email is required")
    }
    if (!name) {
      return ctx.badRequest("Purchaser name is required")
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

    if (!event.ticketingEnabled) {
      return ctx.badRequest("Ticketing is not enabled for this event")
    }

    if (event.eventStatus !== "Open") {
      return ctx.badRequest("Event is not open for registration")
    }

    if (event.paymentProvider !== "stripe") {
      return ctx.badRequest("Online payment is not available for this event")
    }

    // Validate tickets and calculate total
    let totalAmount = 0
    let totalQuantity = 0
    const lineItems: Array<{ name: string; description?: string; unitPrice: number; quantity: number }> = []
    const ticketDetails: Array<{
      ticketTypeId: string
      ticketTypeName: string
      quantity: number
      price: number
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

      // Check ticket type capacity
      const available = ticketType.capacity
        ? ticketType.capacity - (ticketType.soldCount || 0)
        : Infinity

      if (ticketRequest.quantity > available) {
        return ctx.badRequest(`Not enough tickets available for ${ticketType.name}`)
      }

      totalAmount += ticketType.price * ticketRequest.quantity
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
        price: ticketType.price,
        currency: ticketType.currency,
      })
    }

    // Check global event capacity
    if (event.globalCapacity) {
      const currentAttendees = event.players?.length || 0
      const pendingTickets = await this.getPendingTicketCount(eventId)

      if (currentAttendees + pendingTickets + totalQuantity > event.globalCapacity) {
        return ctx.badRequest("Event has reached capacity")
      }
    }

    // Get linked player if user is authenticated
    let player = null
    if (user) {
      player = await this.getLinkedPlayer(user.id)
    }

    // Create order
    const orderNumber = generateOrderNumber()
    const currency = ticketDetails[0]?.currency || "EUR"

    const order = await strapi.documents("api::ticket-order.ticket-order").create({
      data: {
        orderNumber,
        status: "pending",
        totalAmount,
        currency,
        paymentProvider: "stripe",
        purchaserEmail: email,
        purchaserName: name,
        ticketDetails,
        player: player?.id || null,
        event: event.id,
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

      strapi.log.info(
        `[Ticketing] Order ${orderNumber} created for event ${event.name} - ${totalQuantity} tickets, ${currency} ${totalAmount}`
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
          status: t.status,
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
          fields: ["ticketCode", "status"],
        },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: orders.map((o: any) => ({
        documentId: o.documentId,
        orderNumber: o.orderNumber,
        status: o.status,
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
})
