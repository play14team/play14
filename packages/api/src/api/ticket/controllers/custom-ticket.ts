/**
 * Custom controller for ticket management
 * Handles individual ticket viewing and user's ticket collections
 */

import type { Core } from "@strapi/strapi"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get linked player for a user
   */
  async getLinkedPlayer(userId: number) {
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: userId },
      populate: { player: true },
    })
    return userWithPlayer?.player || null
  },

  /**
   * Get ticket details by document ID or ticket code
   * SECURITY: Anyone can view ticket details (needed for QR code scanning and ticket sharing)
   */
  async getTicketDetails(ctx) {
    const { ticketId } = ctx.params

    // Try to find by document ID first, then by ticket code
    let ticket = await strapi.documents("api::ticket.ticket").findOne({
      documentId: ticketId,
      populate: {
        ticketType: {
          fields: ["name", "price", "currency", "description"],
        },
        event: {
          fields: ["name", "slug", "start", "end", "eventStatus"],
          populate: {
            defaultImage: { fields: ["url", "width", "height"] },
            location: { fields: ["name", "country"] },
            venue: { fields: ["name", "website"] },
          },
        },
        order: {
          fields: ["orderNumber", "purchaserEmail", "purchaserName"],
        },
        player: {
          fields: ["documentId", "name", "slug"],
        },
      },
    })

    // If not found by document ID, try by ticket code
    if (!ticket) {
      ticket = await strapi.documents("api::ticket.ticket").findFirst({
        filters: { ticketCode: ticketId },
        populate: {
          ticketType: {
            fields: ["name", "price", "currency", "description"],
          },
          event: {
            fields: ["name", "slug", "start", "end", "eventStatus"],
            populate: {
              defaultImage: { fields: ["url", "width", "height"] },
              location: { fields: ["name", "country"] },
              venue: { fields: ["name", "website"] },
            },
          },
          order: {
            fields: ["orderNumber", "purchaserEmail", "purchaserName"],
          },
          player: {
            fields: ["documentId", "name", "slug"],
          },
        },
      })
    }

    if (!ticket) {
      return ctx.notFound("Ticket not found")
    }

    // Extract attendee info from component if available
    const attendeeInfo = (ticket as any).attendeeInfo || null
    let attendeeDetails = null
    if (attendeeInfo) {
      attendeeDetails = {
        firstName: attendeeInfo.firstName,
        lastName: attendeeInfo.lastName,
        email: attendeeInfo.email,
        tshirtSize: attendeeInfo.tshirtSize,
        foodPreferences: attendeeInfo.foodPreferences,
      }
    }

    // Return ticket details
    return ctx.send({
      data: {
        documentId: ticket.documentId,
        ticketCode: ticket.ticketCode,
        ticketStatus: ticket.ticketStatus,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        attendeeDetails,
        checkedInAt: ticket.checkedInAt,
        ticketType: ticket.ticketType
          ? {
              name: ticket.ticketType.name,
              price: ticket.ticketType.price,
              currency: ticket.ticketType.currency,
              description: ticket.ticketType.description,
            }
          : null,
        event: ticket.event
          ? {
              documentId: ticket.event.documentId,
              name: ticket.event.name,
              slug: ticket.event.slug,
              start: ticket.event.start,
              end: ticket.event.end,
              eventStatus: ticket.event.eventStatus,
              defaultImage: ticket.event.defaultImage,
              location: ticket.event.location,
              venue: ticket.event.venue,
            }
          : null,
        order: ticket.order
          ? {
              orderNumber: ticket.order.orderNumber,
              // Mask purchaser email for privacy (show first part only)
              purchaserEmail: `${ticket.order.purchaserEmail?.split("@")[0]?.substring(0, 3)}***@***`,
              purchaserName: `${ticket.order.purchaserName?.split(" ")[0]} ***`,
            }
          : null,
        player: ticket.player
          ? {
              documentId: ticket.player.documentId,
              name: ticket.player.name,
              slug: ticket.player.slug,
            }
          : null,
      },
    })
  },

  /**
   * Get current user's tickets across all orders
   */
  async getMyTickets(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)

    // Find tickets by email or player
    const filters: any = {
      $or: [{ attendeeEmail: user.email }],
    }

    if (player) {
      filters.$or.push({ player: { id: player.id } })
    }

    const tickets = await strapi.documents("api::ticket.ticket").findMany({
      filters,
      populate: {
        ticketType: {
          fields: ["name", "price", "currency"],
        },
        event: {
          fields: ["documentId", "name", "slug", "start", "end", "eventStatus"],
          populate: {
            defaultImage: { fields: ["url", "width", "height"] },
            location: { fields: ["name"] },
          },
        },
        order: {
          fields: ["orderNumber", "status"],
        },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: tickets.map((t: any) => ({
        documentId: t.documentId,
        ticketCode: t.ticketCode,
        ticketStatus: t.ticketStatus,
        attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail,
        checkedInAt: t.checkedInAt,
        ticketType: t.ticketType
          ? {
              name: t.ticketType.name,
              price: t.ticketType.price,
              currency: t.ticketType.currency,
            }
          : null,
        event: t.event,
        order: t.order
          ? {
              orderNumber: t.order.orderNumber,
              status: t.order.status,
            }
          : null,
      })),
    })
  },
})
