/**
 * Custom controller for result line item management
 * Allows hosts to manage result income/expense items for their events
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
   * List result items for an event
   */
  async list(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params

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
      return ctx.forbidden("Only hosts, mentors, or founders can view result items")
    }

    // Get result items
    const resultItems = await strapi.documents("api::result-line-item.result-line-item").findMany({
      filters: {
        event: { documentId: eventId },
      },
      sort: { sortOrder: "asc", createdAt: "asc" },
    })

    return ctx.send({
      data: resultItems,
    })
  },

  /**
   * Create a result item for an event
   */
  async create(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const { category, name, description, amount, sortOrder } = ctx.request.body?.data || {}

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
      return ctx.forbidden("Only hosts, mentors, or founders can manage result items")
    }

    // Validate required fields
    if (!category) {
      return ctx.badRequest("Category is required")
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    if (amount === undefined || amount === null) {
      return ctx.badRequest("Amount is required")
    }

    // Create the result item
    const resultItem = await strapi.documents("api::result-line-item.result-line-item").create({
      data: {
        category,
        name: name.trim(),
        description: description || null,
        amount: Number(amount),
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        event: event.id,
      } as any,
    })

    strapi.log.info(
      `[Results] Result item "${name}" created for event ${event.name} by ${player.name}`
    )

    return ctx.send({
      data: resultItem,
    })
  },

  /**
   * Update a result item
   */
  async update(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const { category, name, description, amount, sortOrder } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find result item
    const resultItem = await strapi.documents("api::result-line-item.result-line-item").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!resultItem) {
      return ctx.notFound("Result item not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, resultItem.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage result items")
    }

    // Build update data
    const updateData: any = {}

    if (category !== undefined) {
      updateData.category = category
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return ctx.badRequest("Name cannot be empty")
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (amount !== undefined) {
      updateData.amount = Number(amount)
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder)
    }

    // Update the result item
    const updated = await strapi.documents("api::result-line-item.result-line-item").update({
      documentId: id,
      data: updateData,
    })

    strapi.log.info(`[Results] Result item ${id} updated by ${player.name}`)

    return ctx.send({
      data: updated,
    })
  },

  /**
   * Delete a result item
   */
  async delete(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find result item
    const resultItem = await strapi.documents("api::result-line-item.result-line-item").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!resultItem) {
      return ctx.notFound("Result item not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, resultItem.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage result items")
    }

    // Delete the result item
    await strapi.documents("api::result-line-item.result-line-item").delete({
      documentId: id,
    })

    strapi.log.info(`[Results] Result item ${id} deleted by ${player.name}`)

    return ctx.send({
      data: { success: true },
    })
  },

  /**
   * Bulk update result items (for reordering or batch saves)
   */
  async bulkUpdate(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const { items } = ctx.request.body?.data || {}

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
      return ctx.forbidden("Only hosts, mentors, or founders can manage result items")
    }

    if (!Array.isArray(items)) {
      return ctx.badRequest("Items must be an array")
    }

    const results = []

    for (const item of items) {
      if (item.documentId) {
        // Update existing item
        const updated = await strapi.documents("api::result-line-item.result-line-item").update({
          documentId: item.documentId,
          data: {
            category: item.category,
            name: item.name,
            description: item.description,
            amount: item.amount !== undefined ? Number(item.amount) : undefined,
            sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : undefined,
          } as any,
        })
        results.push(updated)
      } else {
        // Create new item
        const created = await strapi.documents("api::result-line-item.result-line-item").create({
          data: {
            category: item.category,
            name: item.name,
            description: item.description || null,
            amount: item.amount !== undefined ? Number(item.amount) : 0,
            sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : 0,
            event: event.id,
          } as any,
        })
        results.push(created)
      }
    }

    strapi.log.info(
      `[Results] Bulk update: ${results.length} items for event ${event.name} by ${player.name}`
    )

    return ctx.send({
      data: results,
    })
  },
})
