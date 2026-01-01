/**
 * Custom controller for event creation
 * Handles event creation with default schedules and tickets
 * Only accessible by Hosts, Mentors, and Founders
 */

import type { Core } from "@strapi/strapi"
import { generateTimetable } from "../templates/schedule-templates"

const ORGANIZER_POSITIONS = ["Host", "Mentor", "Founder"]

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
   * Check if a player is a Host, Mentor, or Founder
   */
  isOrganizer(position: string | undefined): boolean {
    return ORGANIZER_POSITIONS.includes(position || "")
  },

  /**
   * Get events for the current organizer
   * - Hosts see events they host
   * - Mentors see events they mentor
   * - Founders see all events
   */
  async getMyEvents(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can access this resource")
    }

    const isFounder = player.position === "Founder"

    // Build filters based on role
    let filters: any = {}
    if (!isFounder) {
      // Hosts/Mentors only see events they're associated with
      filters = {
        $or: [
          { hosts: { documentId: player.documentId } },
          { mentors: { documentId: player.documentId } },
        ],
      }
    }

    // Query published events to get their documentIds
    const publishedEvents = await strapi.documents("api::event.event").findMany({
      filters,
      fields: ["documentId"],
      status: "published",
    })
    const publishedIds = new Set(publishedEvents.map((e: any) => e.documentId))

    // Query all events (draft status returns all documents)
    const events = await strapi.documents("api::event.event").findMany({
      filters,
      populate: {
        location: { fields: ["name", "country"] },
      },
      sort: { start: "desc" },
    })

    strapi.log.info(
      `[Event] getMyEvents: Found ${events.length} events for ${player.name} (${player.position})`
    )

    return ctx.send({
      data: events.map((e: any) => ({
        documentId: e.documentId,
        slug: e.slug,
        name: e.name,
        start: e.start,
        end: e.end,
        eventStatus: e.eventStatus,
        isPublished: publishedIds.has(e.documentId),
        location: e.location
          ? { name: e.location.name, country: e.location.country }
          : null,
      })),
    })
  },

  /**
   * Get available event locations for dropdown
   */
  async getLocations(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player || !this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can access this resource")
    }

    const locations = await strapi
      .documents("api::event-location.event-location")
      .findMany({
        fields: ["documentId", "name", "country"],
        sort: { name: "asc" },
      })

    return ctx.send({
      data: locations.map((l: any) => ({
        documentId: l.documentId,
        name: l.name,
        country: l.country,
      })),
    })
  },

  /**
   * Get available venues for dropdown
   */
  async getVenues(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player || !this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can access this resource")
    }

    const venues = await strapi.documents("api::venue.venue").findMany({
      fields: ["documentId", "name", "addressDetails"],
      sort: { name: "asc" },
    })

    return ctx.send({
      data: venues.map((v: any) => ({
        documentId: v.documentId,
        name: v.name,
        addressDetails: v.addressDetails,
      })),
    })
  },

  /**
   * Get available organizers (players who can be hosts or mentors)
   * Returns players with position Host, Mentor, or Founder
   */
  async getOrganizers(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player || !this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can access this resource")
    }

    const organizers = await strapi.documents("api::player.player").findMany({
      filters: {
        $or: [
          { position: "Host" },
          { position: "Mentor" },
          { position: "Founder" },
        ],
      },
      fields: ["documentId", "name", "position"],
      sort: { name: "asc" },
    })

    strapi.log.info(
      `[Event] getOrganizers: Found ${organizers.length} organizers for ${player.name}`
    )

    return ctx.send({
      data: organizers.map((p: any) => ({
        documentId: p.documentId,
        name: p.name,
        position: p.position,
      })),
    })
  },

  /**
   * Create default ticket types for an event
   */
  async createDefaultTickets(eventId: number, startDate: Date) {
    const oneMonthBefore = new Date(startDate)
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1)

    const twoWeeksBefore = new Date(startDate)
    twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14)

    // Early Bird ticket
    await strapi.documents("api::ticket-type.ticket-type").create({
      data: {
        name: "Early Bird",
        description: "Discounted early registration",
        price: 0, // To be set by organizer
        currency: "EUR",
        capacity: null,
        soldCount: 0,
        validFrom: oneMonthBefore.toISOString(),
        validUntil: twoWeeksBefore.toISOString(),
        sortOrder: 0,
        isActive: true,
        event: eventId,
      } as any,
    })

    // Standard ticket
    await strapi.documents("api::ticket-type.ticket-type").create({
      data: {
        name: "Standard",
        description: "Regular registration",
        price: 0, // To be set by organizer
        currency: "EUR",
        capacity: null,
        soldCount: 0,
        validFrom: twoWeeksBefore.toISOString(),
        validUntil: startDate.toISOString(),
        sortOrder: 1,
        isActive: true,
        event: eventId,
      } as any,
    })
  },

  /**
   * Create a new event with default schedule and tickets
   */
  async createEvent(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only Hosts, Mentors, or Founders can create events")
    }

    const {
      name,
      start,
      end,
      locationId,
      newLocation,
      venueId,
      newVenue,
      description,
      timezone,
    } = ctx.request.body?.data || {}

    // Validation
    if (!name || name.trim().length === 0) {
      return ctx.badRequest("Event name is required")
    }

    if (!start) {
      return ctx.badRequest("Start date is required")
    }

    if (!end) {
      return ctx.badRequest("End date is required")
    }

    if (!locationId && !newLocation) {
      return ctx.badRequest("Location is required")
    }

    if (newLocation && (!newLocation.name || !newLocation.country)) {
      return ctx.badRequest("New location requires name and country")
    }

    // Parse dates
    const startDate = new Date(start)
    const endDate = new Date(end)

    // Validate end is after start
    if (endDate <= startDate) {
      return ctx.badRequest("End date must be after start date")
    }

    // Create location if needed
    let finalLocationId = locationId
    if (newLocation) {
      const createdLocation = await strapi
        .documents("api::event-location.event-location")
        .create({
          data: {
            name: newLocation.name.trim(),
            country: newLocation.country,
          },
        })
      finalLocationId = createdLocation.documentId

      strapi.log.info(
        `[Event] New location "${newLocation.name}" created by ${player.name}`
      )
    }

    // Resolve location to get the numeric ID
    const location = await strapi
      .documents("api::event-location.event-location")
      .findOne({
        documentId: finalLocationId,
      })

    if (!location) {
      return ctx.badRequest("Location not found")
    }

    // Create venue if needed
    let venueNumericId: number | null = null
    if (newVenue && newVenue.name) {
      const createdVenue = await strapi.documents("api::venue.venue").create({
        data: {
          name: newVenue.name.trim(),
          addressDetails: newVenue.addressDetails || null,
        },
      })
      venueNumericId = createdVenue.id

      strapi.log.info(
        `[Event] New venue "${newVenue.name}" created by ${player.name}`
      )
    } else if (venueId) {
      const venue = await strapi.documents("api::venue.venue").findOne({
        documentId: venueId,
      })
      venueNumericId = venue?.id || null
    }

    // Generate dynamic timetable based on actual dates
    const timetable = generateTimetable(startDate, endDate)

    // Create event
    const event = await strapi.documents("api::event.event").create({
      data: {
        name: name.trim(),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        eventStatus: "Announced",
        timezone: timezone || "Europe/Paris",
        description: description || null,
        location: location.id,
        venue: venueNumericId,
        hosts: [player.id],
        timetable: timetable,
        ticketingEnabled: false,
        paymentProvider: "none",
      } as any,
      status: "draft",
    })

    // Create default ticket types
    await this.createDefaultTickets(event.id, startDate)

    strapi.log.info(
      `[Event] Event "${name}" (${event.slug}) created by ${player.name} (${player.position})`
    )

    return ctx.send({
      data: {
        documentId: event.documentId,
        slug: event.slug,
        name: event.name,
        start: event.start,
        end: event.end,
      },
    })
  },

  /**
   * Get event data for editing (organizer only)
   */
  async getEventForEdit(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Fetch event with all relations needed for editing
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        location: { fields: ["documentId", "name", "country"] },
        venue: { fields: ["documentId", "name", "addressDetails"] },
        hosts: { fields: ["documentId", "name"] },
        mentors: { fields: ["documentId", "name"] },
        timetable: { populate: { timeslots: true } },
        ticketTypes: {
          fields: [
            "documentId",
            "name",
            "description",
            "price",
            "currency",
            "capacity",
            "soldCount",
            "validFrom",
            "validUntil",
            "sortOrder",
            "isActive",
          ],
        },
        stripeAccount: {
          fields: [
            "documentId",
            "stripeAccountId",
            "accountStatus",
            "chargesEnabled",
            "payoutsEnabled",
          ],
        },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access (host, mentor, or founder)
    const isHost = (event as any).hosts?.some(
      (h: any) => h.documentId === player.documentId
    )
    const isMentor = (event as any).mentors?.some(
      (m: any) => m.documentId === player.documentId
    )
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event")
    }

    return ctx.send({ data: event })
  },

  /**
   * Update event (organizer only)
   */
  async updateEvent(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user
    const requestData = ctx.request.body?.data

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Fetch event to verify access
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some(
      (h: any) => h.documentId === player.documentId
    )
    const isMentor = (event as any).mentors?.some(
      (m: any) => m.documentId === player.documentId
    )
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event")
    }

    // Build update data with only allowed fields
    const allowedFields = [
      "name",
      "start",
      "end",
      "timezone",
      "eventStatus",
      "tagline",
      "description",
      "contactEmail",
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (requestData[field] !== undefined) {
        updateData[field] = requestData[field]
      }
    }

    // Handle location update (by documentId)
    if (requestData.locationId) {
      const location = await strapi
        .documents("api::event-location.event-location")
        .findOne({ documentId: requestData.locationId })
      if (location) {
        updateData.location = location.id
      }
    }

    // Handle venue update (by documentId)
    if (requestData.venueId !== undefined) {
      if (requestData.venueId === null) {
        updateData.venue = null
      } else {
        const venue = await strapi
          .documents("api::venue.venue")
          .findOne({ documentId: requestData.venueId })
        if (venue) {
          updateData.venue = venue.id
        }
      }
    }

    // Handle hosts update (by documentIds)
    if (requestData.hostIds !== undefined) {
      if (Array.isArray(requestData.hostIds)) {
        const hostPlayers = await Promise.all(
          requestData.hostIds.map((docId: string) =>
            strapi.documents("api::player.player").findOne({ documentId: docId })
          )
        )
        const validHosts = hostPlayers.filter(
          (p: any) => p && ORGANIZER_POSITIONS.includes(p.position)
        )
        updateData.hosts = validHosts.map((p: any) => p.id)
      }
    }

    // Handle mentors update (by documentIds)
    if (requestData.mentorIds !== undefined) {
      if (Array.isArray(requestData.mentorIds)) {
        const mentorPlayers = await Promise.all(
          requestData.mentorIds.map((docId: string) =>
            strapi.documents("api::player.player").findOne({ documentId: docId })
          )
        )
        const validMentors = mentorPlayers.filter(
          (p: any) => p && ORGANIZER_POSITIONS.includes(p.position)
        )
        updateData.mentors = validMentors.map((p: any) => p.id)
      }
    }

    // Update the event
    const updated = await strapi.documents("api::event.event").update({
      documentId: event.documentId,
      data: updateData,
    })

    strapi.log.info(
      `[Event] Event "${updated.name}" (${updated.slug}) updated by ${player.name}`
    )

    return ctx.send({
      data: {
        documentId: updated.documentId,
        slug: updated.slug,
        name: updated.name,
      },
    })
  },
})
