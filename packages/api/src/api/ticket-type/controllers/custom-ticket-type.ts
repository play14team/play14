/**
 * Custom controller for ticket type management
 * Allows hosts to manage ticket types for their events
 */

import type { Core } from "@strapi/strapi"

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
   * Check if player is a host, mentor, or founder for an event
   */
  async isEventOrganizer(playerId: number, eventDocumentId: string): Promise<boolean> {
    // Check if player is a founder (has full access)
    const player = await strapi.documents("api::player.player").findFirst({
      filters: { id: playerId },
    })

    if (player?.position === "Founder") {
      return true
    }

    // Check if player is host or mentor of the event
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventDocumentId,
      populate: {
        hosts: { fields: ["id"] },
        mentors: { fields: ["id"] },
      },
    })

    if (!event) return false

    const isHost = event.hosts?.some((h: any) => h.id === playerId)
    const isMentor = event.mentors?.some((m: any) => m.id === playerId)

    return isHost || isMentor
  },

  /**
   * Create a ticket type for an event
   */
  async createTicketType(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const {
      name,
      description,
      price,
      currency,
      capacity,
      validFrom,
      validUntil,
      sortOrder,
      isActive,
    } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Verify event exists
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, eventId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage ticket types")
    }

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return ctx.badRequest("Valid price is required (must be 0 or greater)")
    }

    // Create the ticket type
    const ticketType = await strapi.documents("api::ticket-type.ticket-type").create({
      data: {
        name: name.trim(),
        description: description || null,
        price: Number(price),
        currency: currency || "EUR",
        capacity: capacity ? Number(capacity) : null,
        soldCount: 0,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        event: event.id,
      } as any,
    })

    strapi.log.info(
      `[Ticketing] Ticket type "${name}" created for event ${event.name} by ${player.name}`
    )

    return ctx.send({
      data: ticketType,
    })
  },

  /**
   * Update a ticket type
   */
  async updateTicketType(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const {
      name,
      description,
      price,
      currency,
      capacity,
      validFrom,
      validUntil,
      sortOrder,
      isActive,
    } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find ticket type
    const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!ticketType) {
      return ctx.notFound("Ticket type not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, ticketType.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage ticket types")
    }

    // Build update data
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return ctx.badRequest("Name cannot be empty")
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) < 0) {
        return ctx.badRequest("Price must be 0 or greater")
      }
      updateData.price = Number(price)
    }

    if (currency !== undefined) {
      updateData.currency = currency
    }

    if (capacity !== undefined) {
      // Validate capacity isn't less than already sold
      if (capacity !== null && Number(capacity) < (ticketType.soldCount || 0)) {
        return ctx.badRequest(
          `Capacity cannot be less than tickets already sold (${ticketType.soldCount})`
        )
      }
      updateData.capacity = capacity ? Number(capacity) : null
    }

    if (validFrom !== undefined) {
      updateData.validFrom = validFrom
    }

    if (validUntil !== undefined) {
      updateData.validUntil = validUntil
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder)
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    // Update the ticket type
    const updated = await strapi.documents("api::ticket-type.ticket-type").update({
      documentId: id,
      data: updateData,
    })

    strapi.log.info(`[Ticketing] Ticket type ${id} updated by ${player.name}`)

    return ctx.send({
      data: updated,
    })
  },

  /**
   * Delete a ticket type
   */
  async deleteTicketType(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find ticket type
    const ticketType = await strapi.documents("api::ticket-type.ticket-type").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!ticketType) {
      return ctx.notFound("Ticket type not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, ticketType.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage ticket types")
    }

    // Check if tickets have been sold
    if (ticketType.soldCount && ticketType.soldCount > 0) {
      return ctx.badRequest(
        `Cannot delete ticket type with sold tickets (${ticketType.soldCount} sold). Deactivate it instead.`
      )
    }

    // Delete the ticket type
    await strapi.documents("api::ticket-type.ticket-type").delete({
      documentId: id,
    })

    strapi.log.info(`[Ticketing] Ticket type ${id} deleted by ${player.name}`)

    return ctx.send({
      data: { success: true },
    })
  },

  /**
   * Get orders for an event (for hosts to view)
   */
  async getEventOrders(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const { status, limit = 50, offset = 0 } = ctx.query

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Verify event exists
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, eventId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can view event orders")
    }

    // Build filters
    const filters: any = {
      event: { documentId: eventId },
    }

    if (status) {
      filters.status = status
    }

    // Get orders
    const orders = await strapi.documents("api::ticket-order.ticket-order").findMany({
      filters,
      populate: {
        player: { fields: ["documentId", "name"] },
        tickets: {
          fields: ["ticketCode", "status", "attendeeName"],
          populate: {
            ticketType: { fields: ["name"] },
          },
        },
      },
      sort: { createdAt: "desc" },
      limit: Number(limit),
      start: Number(offset),
    })

    // Get total count
    const total = await strapi.documents("api::ticket-order.ticket-order").count({
      filters,
    })

    return ctx.send({
      data: orders.map((o: any) => ({
        documentId: o.documentId,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        currency: o.currency,
        purchaserName: o.purchaserName,
        purchaserEmail: o.purchaserEmail,
        paidAt: o.paidAt,
        refundedAt: o.refundedAt,
        player: o.player,
        tickets: o.tickets?.map((t: any) => ({
          ticketCode: t.ticketCode,
          status: t.status,
          attendeeName: t.attendeeName,
          ticketType: t.ticketType?.name,
        })),
      })),
      meta: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    })
  },
})
