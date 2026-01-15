/**
 * Custom controller for budget line item management
 * Allows hosts to manage budget items for their events
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
   * List budget items for an event
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
      return ctx.forbidden("Only hosts, mentors, or founders can view budget items")
    }

    // Get budget items
    const budgetItems = await strapi.documents("api::budget-line-item.budget-line-item").findMany({
      filters: {
        event: { documentId: eventId },
      },
      sort: { sortOrder: "asc", createdAt: "asc" },
    })

    return ctx.send({
      data: budgetItems,
    })
  },

  /**
   * Create a budget item for an event
   */
  async create(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const { category, name, description, unitPrice, quantity, total, sortOrder } =
      ctx.request.body?.data || {}

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
      return ctx.forbidden("Only hosts, mentors, or founders can manage budget items")
    }

    // Validate required fields
    if (!category) {
      return ctx.badRequest("Category is required")
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    // Calculate total if not provided
    const calculatedTotal =
      total !== undefined ? Number(total) : (Number(unitPrice) || 0) * (Number(quantity) || 1)

    // Create the budget item
    const budgetItem = await strapi.documents("api::budget-line-item.budget-line-item").create({
      data: {
        category,
        name: name.trim(),
        description: description || null,
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : 0,
        quantity: quantity !== undefined ? Number(quantity) : 1,
        total: calculatedTotal,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        event: event.id,
      } as any,
    })

    strapi.log.info(
      `[Budget] Budget item "${name}" created for event ${event.name} by ${player.name}`
    )

    return ctx.send({
      data: budgetItem,
    })
  },

  /**
   * Update a budget item
   */
  async update(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const { category, name, description, unitPrice, quantity, total, sortOrder } =
      ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find budget item
    const budgetItem = await strapi.documents("api::budget-line-item.budget-line-item").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!budgetItem) {
      return ctx.notFound("Budget item not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, budgetItem.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage budget items")
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

    if (unitPrice !== undefined) {
      updateData.unitPrice = Number(unitPrice)
    }

    if (quantity !== undefined) {
      updateData.quantity = Number(quantity)
    }

    if (total !== undefined) {
      updateData.total = Number(total)
    } else if (unitPrice !== undefined || quantity !== undefined) {
      // Recalculate total if price or quantity changed
      const newUnitPrice =
        unitPrice !== undefined ? Number(unitPrice) : Number(budgetItem.unitPrice) || 0
      const newQuantity =
        quantity !== undefined ? Number(quantity) : Number(budgetItem.quantity) || 1
      updateData.total = newUnitPrice * newQuantity
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder)
    }

    // Update the budget item
    const updated = await strapi.documents("api::budget-line-item.budget-line-item").update({
      documentId: id,
      data: updateData,
    })

    strapi.log.info(`[Budget] Budget item ${id} updated by ${player.name}`)

    return ctx.send({
      data: updated,
    })
  },

  /**
   * Delete a budget item
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

    // Find budget item
    const budgetItem = await strapi.documents("api::budget-line-item.budget-line-item").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!budgetItem) {
      return ctx.notFound("Budget item not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, budgetItem.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage budget items")
    }

    // Delete the budget item
    await strapi.documents("api::budget-line-item.budget-line-item").delete({
      documentId: id,
    })

    strapi.log.info(`[Budget] Budget item ${id} deleted by ${player.name}`)

    return ctx.send({
      data: { success: true },
    })
  },

  /**
   * Bulk update budget items (for reordering or batch saves)
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
      return ctx.forbidden("Only hosts, mentors, or founders can manage budget items")
    }

    if (!Array.isArray(items)) {
      return ctx.badRequest("Items must be an array")
    }

    const results = []

    for (const item of items) {
      if (item.documentId) {
        // Update existing item
        const updated = await strapi.documents("api::budget-line-item.budget-line-item").update({
          documentId: item.documentId,
          data: {
            category: item.category,
            name: item.name,
            description: item.description,
            unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : undefined,
            quantity: item.quantity !== undefined ? Number(item.quantity) : undefined,
            total: item.total !== undefined ? Number(item.total) : undefined,
            sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : undefined,
          } as any,
        })
        results.push(updated)
      } else {
        // Create new item
        const calculatedTotal =
          item.total !== undefined
            ? Number(item.total)
            : (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)

        const created = await strapi.documents("api::budget-line-item.budget-line-item").create({
          data: {
            category: item.category,
            name: item.name,
            description: item.description || null,
            unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : 0,
            quantity: item.quantity !== undefined ? Number(item.quantity) : 1,
            total: calculatedTotal,
            sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : 0,
            event: event.id,
          } as any,
        })
        results.push(created)
      }
    }

    strapi.log.info(
      `[Budget] Bulk update: ${results.length} items for event ${event.name} by ${player.name}`
    )

    return ctx.send({
      data: results,
    })
  },
})
