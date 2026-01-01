/**
 * Custom controller for attendance claim management
 * Handles claim submission, approval, rejection, and player-event linking
 */

import type { Core } from "@strapi/strapi"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get the current user's linked player
   */
  async getLinkedPlayer(userId: number) {
    const userWithPlayer = await strapi
      .documents("plugin::users-permissions.user")
      .findFirst({
        filters: { id: userId },
        populate: { player: true },
      })
    return userWithPlayer?.player || null
  },

  /**
   * Check if a player is a host or mentor of an event
   */
  async isEventOrganizer(playerId: number, eventDocumentId: string): Promise<boolean> {
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
   * Get events with status "Over" that the player can claim attendance for
   */
  async getOverEvents(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Get all "Over" events
    const events = await strapi.documents("api::event.event").findMany({
      filters: {
        eventStatus: "Over",
      },
      populate: {
        defaultImage: { fields: ["name", "url", "width", "height"] },
        location: { fields: ["name", "slug"] },
      },
      sort: { start: "desc" },
      limit: 50,
    })

    // Get player's existing attendance (approved) and pending claims
    const existingAttendance = await strapi.documents("api::player.player").findOne({
      documentId: player.documentId,
      populate: {
        attended: { fields: ["documentId"] },
      },
    })

    const pendingClaims = await strapi.documents("api::attendance-claim.attendance-claim").findMany({
      filters: {
        player: { id: player.id },
        claimStatus: "pending",
      },
      populate: {
        event: { fields: ["documentId"] },
      },
    })

    const attendedIds = new Set(existingAttendance?.attended?.map((e: any) => e.documentId) || [])
    const pendingIds = new Set(pendingClaims.map((c: any) => c.event?.documentId))

    // Filter out events the player already attended or has pending claims for
    const claimableEvents = events.filter(
      (e) => !attendedIds.has(e.documentId) && !pendingIds.has(e.documentId)
    )

    return ctx.send({
      data: {
        events: claimableEvents.map((e) => ({
          documentId: e.documentId,
          name: e.name,
          slug: e.slug,
          start: e.start,
          end: e.end,
          defaultImage: e.defaultImage,
          location: e.location,
        })),
      },
    })
  },

  /**
   * Search "Over" events by name or location
   */
  async searchEvents(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const query = (ctx.query.query || "").toString().toLowerCase()

    if (!query || query.length < 2) {
      return ctx.send({ data: { events: [] } })
    }

    // Get all "Over" events
    const events = await strapi.documents("api::event.event").findMany({
      filters: {
        eventStatus: "Over",
      },
      populate: {
        defaultImage: { fields: ["name", "url", "width", "height"] },
        location: { fields: ["name", "slug"] },
      },
      sort: { start: "desc" },
    })

    // Get player's existing attendance and pending claims
    const existingAttendance = await strapi.documents("api::player.player").findOne({
      documentId: player.documentId,
      populate: {
        attended: { fields: ["documentId"] },
      },
    })

    const pendingClaims = await strapi.documents("api::attendance-claim.attendance-claim").findMany({
      filters: {
        player: { id: player.id },
        claimStatus: "pending",
      },
      populate: {
        event: { fields: ["documentId"] },
      },
    })

    const attendedIds = new Set(existingAttendance?.attended?.map((e: any) => e.documentId) || [])
    const pendingIds = new Set(pendingClaims.map((c: any) => c.event?.documentId))

    // Filter and search
    const matchingEvents = events
      .filter((e) => !attendedIds.has(e.documentId) && !pendingIds.has(e.documentId))
      .filter((e) => {
        const nameMatch = e.name.toLowerCase().includes(query)
        const locationMatch = e.location?.name?.toLowerCase().includes(query)
        return nameMatch || locationMatch
      })
      .slice(0, 20)

    return ctx.send({
      data: {
        events: matchingEvents.map((e) => ({
          documentId: e.documentId,
          name: e.name,
          slug: e.slug,
          start: e.start,
          end: e.end,
          defaultImage: e.defaultImage,
          location: e.location,
        })),
      },
    })
  },

  /**
   * Get the current player's attendance claims
   */
  async getMyClaims(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const claims = await strapi.documents("api::attendance-claim.attendance-claim").findMany({
      filters: {
        player: { id: player.id },
      },
      populate: {
        event: {
          fields: ["documentId", "name", "slug", "start", "end"],
          populate: {
            defaultImage: { fields: ["name", "url", "width", "height"] },
            location: { fields: ["name", "slug"] },
          },
        },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: claims,
    })
  },

  /**
   * Submit an attendance claim for an event
   */
  async submitClaim(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile to claim attendance")
    }

    const { eventId, reason } = ctx.request.body?.data || {}

    if (!eventId) {
      return ctx.badRequest("Event ID is required")
    }

    if (!reason || reason.length < 20) {
      return ctx.badRequest("Please provide a reason with at least 20 characters")
    }

    // Check if event exists and is "Over"
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        players: { fields: ["id"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    if (event.eventStatus !== "Over") {
      return ctx.badRequest("You can only claim attendance for events that are over")
    }

    // Check if player already attended this event
    const alreadyAttended = event.players?.some((p: any) => p.id === player.id)
    if (alreadyAttended) {
      return ctx.badRequest("You are already listed as an attendee for this event")
    }

    // Check for existing pending claim
    const existingClaim = await strapi.documents("api::attendance-claim.attendance-claim").findMany({
      filters: {
        player: { id: player.id },
        event: { documentId: eventId },
        claimStatus: "pending",
      },
    })

    if (existingClaim.length > 0) {
      return ctx.badRequest("You already have a pending claim for this event")
    }

    // Create the claim
    const claim = await strapi.documents("api::attendance-claim.attendance-claim").create({
      data: {
        claimStatus: "pending",
        player: player.id,
        event: event.id,
        reason,
      },
      populate: {
        event: {
          fields: ["documentId", "name", "slug", "start", "end"],
          populate: {
            defaultImage: { fields: ["name", "url", "width", "height"] },
            location: { fields: ["name", "slug"] },
          },
        },
      },
    })

    strapi.log.info(
      `[AttendanceClaim] Player ${player.id} (${player.name}) submitted claim for event ${eventId}`
    )

    return ctx.send({
      data: claim,
    })
  },

  /**
   * Cancel the player's own pending claim
   */
  async cancelClaim(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the claim
    const claim = await strapi.documents("api::attendance-claim.attendance-claim").findOne({
      documentId: id,
      populate: {
        player: true,
      },
    })

    if (!claim) {
      return ctx.notFound("Claim not found")
    }

    // Check ownership
    if (claim.player?.id !== player.id) {
      return ctx.forbidden("You can only cancel your own claims")
    }

    // Check status
    if (claim.claimStatus !== "pending") {
      return ctx.badRequest("Only pending claims can be cancelled")
    }

    // Delete the claim
    await strapi.documents("api::attendance-claim.attendance-claim").delete({
      documentId: id,
    })

    strapi.log.info(`[AttendanceClaim] Player ${player.id} cancelled claim ${id}`)

    return ctx.send({
      data: { success: true },
    })
  },

  /**
   * Get pending claims for events the current player hosts or mentors
   */
  async getPendingClaimsForMyEvents(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Get events where the player is a host or mentor
    const playerWithEvents = await strapi.documents("api::player.player").findOne({
      documentId: player.documentId,
      populate: {
        hosted: { fields: ["id", "documentId"] },
        mentored: { fields: ["id", "documentId"] },
      },
    })

    const hostedIds = playerWithEvents?.hosted?.map((e: any) => e.id) || []
    const mentoredIds = playerWithEvents?.mentored?.map((e: any) => e.id) || []
    const organizedEventIds = [...new Set([...hostedIds, ...mentoredIds])]

    if (organizedEventIds.length === 0) {
      return ctx.send({
        data: [],
      })
    }

    // Get pending claims for these events
    const claims = await strapi.documents("api::attendance-claim.attendance-claim").findMany({
      filters: {
        claimStatus: "pending",
        event: {
          id: { $in: organizedEventIds },
        },
      },
      populate: {
        player: {
          fields: ["documentId", "name", "slug", "position"],
          populate: {
            avatar: { fields: ["name", "url", "width", "height"] },
          },
        },
        event: {
          fields: ["documentId", "name", "slug", "start", "end"],
          populate: {
            defaultImage: { fields: ["name", "url", "width", "height"] },
            location: { fields: ["name", "slug"] },
          },
        },
      },
      sort: { createdAt: "asc" },
    })

    return ctx.send({
      data: claims,
    })
  },

  /**
   * Approve an attendance claim (host/mentor only)
   */
  async approveClaim(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const { adminNotes } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the claim
    const claim = await strapi.documents("api::attendance-claim.attendance-claim").findOne({
      documentId: id,
      populate: {
        player: true,
        event: true,
      },
    })

    if (!claim) {
      return ctx.notFound("Claim not found")
    }

    if (claim.claimStatus !== "pending") {
      return ctx.badRequest("Only pending claims can be approved")
    }

    // Check if current user is a host or mentor of this event
    const isOrganizer = await this.isEventOrganizer(player.id, claim.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts or mentors of this event can approve claims")
    }

    // Link the player to the event (add to attended relation)
    const claimingPlayer = await strapi.documents("api::player.player").findOne({
      documentId: claim.player.documentId,
      populate: {
        attended: { fields: ["id"] },
      },
    })

    const currentAttendedIds = claimingPlayer?.attended?.map((e: any) => e.id) || []
    await strapi.documents("api::player.player").update({
      documentId: claim.player.documentId,
      data: {
        attended: [...currentAttendedIds, claim.event.id],
      } as any,
    })

    // Update the claim status
    const now = new Date().toISOString()
    const updatedClaim = await strapi.documents("api::attendance-claim.attendance-claim").update({
      documentId: id,
      data: {
        claimStatus: "approved",
        adminNotes: adminNotes || null,
        processedAt: now,
        processedBy: player.id,
      } as any,
    })

    strapi.log.info(
      `[AttendanceClaim] Claim ${id} approved by ${player.name}. Player ${claim.player.documentId} linked to event ${claim.event.documentId}`
    )

    return ctx.send({
      data: updatedClaim,
    })
  },

  /**
   * Get pending attendance claims for a player by documentId (public endpoint)
   * Used to display pending claims on player profile
   */
  async getPendingClaimsForPlayer(ctx) {
    const { playerDocumentId } = ctx.params

    if (!playerDocumentId) {
      return ctx.badRequest("Player document ID is required")
    }

    // Get pending claims for this player
    const claims = await strapi.documents("api::attendance-claim.attendance-claim").findMany({
      filters: {
        player: { documentId: playerDocumentId },
        claimStatus: "pending",
      },
      populate: {
        event: {
          fields: ["documentId", "name", "slug", "start", "end"],
          populate: {
            defaultImage: { fields: ["name", "url", "width", "height"] },
            location: { fields: ["name", "slug"] },
          },
        },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: claims.map((c: any) => ({
        documentId: c.documentId,
        claimStatus: c.claimStatus,
        event: c.event,
      })),
    })
  },

  /**
   * Reject an attendance claim (host/mentor only)
   */
  async rejectClaim(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const { adminNotes } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the claim
    const claim = await strapi.documents("api::attendance-claim.attendance-claim").findOne({
      documentId: id,
      populate: {
        player: true,
        event: true,
      },
    })

    if (!claim) {
      return ctx.notFound("Claim not found")
    }

    if (claim.claimStatus !== "pending") {
      return ctx.badRequest("Only pending claims can be rejected")
    }

    // Check if current user is a host or mentor of this event
    const isOrganizer = await this.isEventOrganizer(player.id, claim.event.documentId)
    if (!isOrganizer) {
      return ctx.forbidden("Only hosts or mentors of this event can reject claims")
    }

    // Update the claim status
    const now = new Date().toISOString()
    const updatedClaim = await strapi.documents("api::attendance-claim.attendance-claim").update({
      documentId: id,
      data: {
        claimStatus: "rejected",
        adminNotes: adminNotes || null,
        processedAt: now,
        processedBy: player.id,
      } as any,
    })

    strapi.log.info(`[AttendanceClaim] Claim ${id} rejected by ${player.name}`)

    return ctx.send({
      data: updatedClaim,
    })
  },
})
