/**
 * Custom controller for discount code management
 * Allows hosts to create and manage discount codes for their events
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
   * Create a discount code for an event
   */
  async createDiscountCode(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      validFrom,
      validUntil,
      minOrderAmount,
      maxDiscountAmount,
      isActive,
      description,
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
      return ctx.forbidden("Only hosts, mentors, or founders can manage discount codes")
    }

    // Validate required fields
    if (!code || typeof code !== "string" || code.trim().length < 3) {
      return ctx.badRequest("Code is required (minimum 3 characters)")
    }

    if (!discountType || !["percentage", "fixed"].includes(discountType)) {
      return ctx.badRequest("Discount type must be 'percentage' or 'fixed'")
    }

    if (
      discountValue === undefined ||
      discountValue === null ||
      Number.isNaN(Number(discountValue)) ||
      Number(discountValue) < 0
    ) {
      return ctx.badRequest("Valid discount value is required (must be 0 or greater)")
    }

    // Validate percentage is between 0 and 100
    if (discountType === "percentage" && Number(discountValue) > 100) {
      return ctx.badRequest("Percentage discount cannot exceed 100%")
    }

    // Check if code already exists for this event (case-insensitive)
    const existingCode = await strapi.documents("api::discount-code.discount-code").findFirst({
      filters: {
        code: { $eqi: code.trim() },
        event: { documentId: eventId },
      },
    })

    if (existingCode) {
      return ctx.badRequest("A discount code with this name already exists for this event")
    }

    // Create the discount code
    const discountCode = await strapi.documents("api::discount-code.discount-code").create({
      data: {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        maxUses: maxUses ? Number(maxUses) : null,
        usedCount: 0,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        description: description || null,
        event: event.id,
        createdByPlayer: player.id,
      } as any,
    })

    strapi.log.info(`[Discount] Code "${code}" created for event ${event.name} by ${player.name}`)

    return ctx.send({
      data: discountCode,
    })
  },

  /**
   * Update a discount code
   */
  async updateDiscountCode(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      validFrom,
      validUntil,
      minOrderAmount,
      maxDiscountAmount,
      isActive,
      description,
    } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find discount code
    const discountCode = await strapi.documents("api::discount-code.discount-code").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!discountCode) {
      return ctx.notFound("Discount code not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, discountCode.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage discount codes")
    }

    // Build update data
    const updateData: any = {}

    if (code !== undefined) {
      if (typeof code !== "string" || code.trim().length < 3) {
        return ctx.badRequest("Code must be at least 3 characters")
      }

      // Check if new code already exists for this event (excluding current)
      const existingCode = await strapi.documents("api::discount-code.discount-code").findFirst({
        filters: {
          code: { $eqi: code.trim() },
          event: { documentId: discountCode.event.documentId },
          documentId: { $ne: id },
        },
      })

      if (existingCode) {
        return ctx.badRequest("A discount code with this name already exists for this event")
      }

      updateData.code = code.trim().toUpperCase()
    }

    if (discountType !== undefined) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return ctx.badRequest("Discount type must be 'percentage' or 'fixed'")
      }
      updateData.discountType = discountType
    }

    if (discountValue !== undefined) {
      if (Number.isNaN(Number(discountValue)) || Number(discountValue) < 0) {
        return ctx.badRequest("Discount value must be 0 or greater")
      }
      const type = discountType || discountCode.discountType
      if (type === "percentage" && Number(discountValue) > 100) {
        return ctx.badRequest("Percentage discount cannot exceed 100%")
      }
      updateData.discountValue = Number(discountValue)
    }

    if (maxUses !== undefined) {
      // Cannot reduce maxUses below usedCount
      if (maxUses !== null && Number(maxUses) < (discountCode.usedCount || 0)) {
        return ctx.badRequest(
          `Max uses cannot be less than times already used (${discountCode.usedCount})`
        )
      }
      updateData.maxUses = maxUses ? Number(maxUses) : null
    }

    if (validFrom !== undefined) {
      updateData.validFrom = validFrom
    }

    if (validUntil !== undefined) {
      updateData.validUntil = validUntil
    }

    if (minOrderAmount !== undefined) {
      updateData.minOrderAmount = minOrderAmount ? Number(minOrderAmount) : null
    }

    if (maxDiscountAmount !== undefined) {
      updateData.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    if (description !== undefined) {
      updateData.description = description
    }

    // Update the discount code
    const updated = await strapi.documents("api::discount-code.discount-code").update({
      documentId: id,
      data: updateData,
    })

    strapi.log.info(`[Discount] Code ${id} updated by ${player.name}`)

    return ctx.send({
      data: updated,
    })
  },

  /**
   * Delete a discount code
   */
  async deleteDiscountCode(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find discount code
    const discountCode = await strapi.documents("api::discount-code.discount-code").findOne({
      documentId: id,
      populate: {
        event: true,
      },
    })

    if (!discountCode) {
      return ctx.notFound("Discount code not found")
    }

    // Check authorization
    const isOrganizer = await this.isEventOrganizer(player.id, discountCode.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts, mentors, or founders can manage discount codes")
    }

    // Check if code has been used
    if (discountCode.usedCount && discountCode.usedCount > 0) {
      return ctx.badRequest(
        `Cannot delete discount code that has been used (${discountCode.usedCount} times). Deactivate it instead.`
      )
    }

    // Delete the discount code
    await strapi.documents("api::discount-code.discount-code").delete({
      documentId: id,
    })

    strapi.log.info(`[Discount] Code ${id} deleted by ${player.name}`)

    return ctx.send({
      data: { success: true },
    })
  },

  /**
   * Get discount codes for an event (for hosts)
   */
  async getEventDiscountCodes(ctx) {
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
      return ctx.forbidden("Only hosts, mentors, or founders can view discount codes")
    }

    // Get discount codes
    const discountCodes = await strapi.documents("api::discount-code.discount-code").findMany({
      filters: {
        event: { documentId: eventId },
      },
      populate: {
        createdByPlayer: { fields: ["documentId", "name"] },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: discountCodes,
    })
  },

  /**
   * Validate a discount code (public - called during checkout)
   */
  async validateDiscountCode(ctx) {
    const { eventId } = ctx.params
    const { code, orderAmount } = ctx.request.body?.data || {}

    if (!code || typeof code !== "string") {
      return ctx.badRequest("Discount code is required")
    }

    if (orderAmount === undefined || orderAmount === null || Number.isNaN(Number(orderAmount))) {
      return ctx.badRequest("Order amount is required")
    }

    const amount = Number(orderAmount)

    // Find the discount code (case-insensitive)
    const discountCode = await strapi.documents("api::discount-code.discount-code").findFirst({
      filters: {
        code: { $eqi: code.trim() },
        event: { documentId: eventId },
      },
    })

    if (!discountCode) {
      return ctx.badRequest("Invalid discount code")
    }

    // Check if active
    if (!discountCode.isActive) {
      return ctx.badRequest("This discount code is no longer active")
    }

    // Check date validity
    const now = new Date()
    if (discountCode.validFrom && new Date(discountCode.validFrom) > now) {
      return ctx.badRequest("This discount code is not yet active")
    }
    if (discountCode.validUntil && new Date(discountCode.validUntil) < now) {
      return ctx.badRequest("This discount code has expired")
    }

    // Check usage limits
    if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
      return ctx.badRequest("This discount code has reached its usage limit")
    }

    // Check minimum order amount
    if (discountCode.minOrderAmount && amount < discountCode.minOrderAmount) {
      return ctx.badRequest(
        `Minimum order amount of ${discountCode.minOrderAmount} required for this code`
      )
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

    return ctx.send({
      data: {
        valid: true,
        code: discountCode.code,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmount,
        finalAmount: Math.round((amount - discountAmount) * 100) / 100,
        description: discountCode.description,
      },
    })
  },
})
