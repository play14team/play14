/**
 * Custom controller for event creation
 * Handles event creation with default schedules and tickets
 * Only accessible by Hosts, Mentors, and Founders
 */

import * as fs from "node:fs"
import type { Core } from "@strapi/strapi"
import { imageSize } from "image-size"
import { toSlug } from "../../../libs/strings"
import { generateTicketCode } from "../../../libs/tickets"
import { validateEmail } from "../../../libs/validation"
import { acquireLock, releaseLock } from "../../../services/cron/distributed-lock"
import { triggerContentRevalidation } from "../../../services/frontend-revalidation"
import {
  addPlayerToEventAttendees,
  removePlayerFromEventAttendees,
} from "../../../services/ticketing/player-service"
import { generateTimetable } from "../templates/schedule-templates"

const ORGANIZER_POSITIONS = ["Host", "Mentor", "Founder"]

// Name of the per-event ticket type used for participants enrolled by an
// organizer (e.g. when ticketing is handled by an external tool). Kept
// inactive so it never appears in public ticket sales.
export const EXTERNAL_TICKET_TYPE_NAME = "external"

// Default image aspect ratio requirements (600x500 = 6:5 = 1.2)
const DEFAULT_IMAGE_ASPECT_RATIO = 6 / 5 // 1.2
const ASPECT_RATIO_TOLERANCE = 0.02 // Allow 2% tolerance for rounding

// Gallery image max dimension (web optimized)
const GALLERY_IMAGE_MAX_DIMENSION = 1920

/**
 * Get image dimensions from a file
 * @param filePath - Path to the image file
 * @returns Object with width and height, or null if unable to read
 */
function getImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const buffer = fs.readFileSync(filePath)
    const dimensions = imageSize(buffer)
    if (dimensions.width && dimensions.height) {
      return { width: dimensions.width, height: dimensions.height }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validate that an image has the correct aspect ratio for default event images
 * @param width - Image width
 * @param height - Image height
 * @returns true if aspect ratio is valid (6:5), false otherwise
 */
function isValidDefaultImageRatio(width: number, height: number): boolean {
  const ratio = width / height
  return Math.abs(ratio - DEFAULT_IMAGE_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE
}

/**
 * Get or create a folder in the media library by name
 * @param strapi - Strapi instance
 * @param folderName - Name of the folder
 * @param parentId - Parent folder ID (null for root level)
 * @returns The folder ID
 */
async function getOrCreateFolder(
  strapi: Core.Strapi,
  folderName: string,
  parentId: number | null = null
): Promise<number> {
  // Try to find existing folder by name and parent
  const existingFolder = await strapi.db.query("plugin::upload.folder").findOne({
    where: {
      name: folderName,
      parent: parentId,
    },
  })

  if (existingFolder) {
    return existingFolder.id
  }

  // Get the next pathId for creating a new folder
  const maxPathIdResult = await strapi.db.query("plugin::upload.folder").findMany({
    orderBy: { pathId: "desc" },
    limit: 1,
  })

  const nextPathId = maxPathIdResult.length > 0 ? maxPathIdResult[0].pathId + 1 : 1

  // Build the path based on parent
  let path: string
  if (parentId) {
    const parentFolder = await strapi.db.query("plugin::upload.folder").findOne({
      where: { id: parentId },
    })
    path = parentFolder ? `${parentFolder.path}/${nextPathId}` : `/${nextPathId}`
  } else {
    path = `/${nextPathId}`
  }

  const newFolder = await strapi.db.query("plugin::upload.folder").create({
    data: {
      name: folderName,
      pathId: nextPathId,
      path,
      parent: parentId,
    },
  })

  strapi.log.info(`[Media] Created folder "${folderName}" with ID ${newFolder.id}`)

  return newFolder.id
}

/**
 * Get or create a nested folder path for event images
 * Creates: events/{locationSlug}/{eventSlug}
 * @param strapi - Strapi instance
 * @param locationSlug - The event location slug
 * @param eventSlug - The event slug
 * @returns The innermost folder ID
 */
async function getOrCreateEventImageFolder(
  strapi: Core.Strapi,
  locationSlug: string,
  eventSlug: string
): Promise<number> {
  // Create events folder at root level
  const eventsFolderId = await getOrCreateFolder(strapi, "events", null)

  // Create location folder inside events
  const locationFolderId = await getOrCreateFolder(strapi, locationSlug, eventsFolderId)

  // Create event folder inside location
  const eventFolderId = await getOrCreateFolder(strapi, eventSlug, locationFolderId)

  return eventFolderId
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
   * Check if a player is a Host, Mentor, or Founder
   */
  isOrganizer(position: string | undefined): boolean {
    return ORGANIZER_POSITIONS.includes(position || "")
  },

  /**
   * Check whether a player may manage a specific event: a Host/Mentor of that event,
   * or a Founder (who can manage any event). The event must be populated with its
   * `hosts` and `mentors` (documentId fields).
   */
  isEventOrganizer(event: any, player: any): boolean {
    const isHost = event?.hosts?.some((h: any) => h.documentId === player?.documentId)
    const isMentor = event?.mentors?.some((m: any) => m.documentId === player?.documentId)
    return Boolean(isHost || isMentor || player?.position === "Founder")
  },

  /**
   * Get events for the current organizer
   * - Hosts see events they host
   * - Mentors see events they mentor
   * - Founders see all events
   * Returns isHost/isMentor flags to enable "Mine" filtering on frontend
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
    // Include hosts and mentors to determine ownership
    const events = await strapi.documents("api::event.event").findMany({
      filters,
      populate: {
        location: { fields: ["name", "country"] },
        defaultImage: { fields: ["url", "alternativeText", "width", "height"] },
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
      sort: { start: "desc" },
    })

    strapi.log.info(
      `[Event] getMyEvents: Found ${events.length} events for ${player.name} (${player.position})`
    )

    return ctx.send({
      data: events.map((e: any) => {
        // Check if current player is a host or mentor of this event
        const isHost = e.hosts?.some((h: any) => h.documentId === player.documentId) || false
        const isMentor = e.mentors?.some((m: any) => m.documentId === player.documentId) || false

        return {
          documentId: e.documentId,
          slug: e.slug,
          name: e.name,
          start: e.start,
          end: e.end,
          eventStatus: e.eventStatus,
          isPublished: publishedIds.has(e.documentId),
          isHost,
          isMentor,
          location: e.location ? { name: e.location.name, country: e.location.country } : null,
          defaultImage: e.defaultImage
            ? {
                url: e.defaultImage.url,
                alternativeText: e.defaultImage.alternativeText,
                width: e.defaultImage.width,
                height: e.defaultImage.height,
              }
            : null,
        }
      }),
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

    const locations = await strapi.documents("api::event-location.event-location").findMany({
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
        $or: [{ position: "Host" }, { position: "Mentor" }, { position: "Founder" }],
      },
      fields: ["documentId", "name", "position"],
      populate: {
        avatar: { fields: ["url"] },
      },
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
        avatar: p.avatar ? { url: p.avatar.url } : null,
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

    const oneDayBefore = new Date(startDate)
    oneDayBefore.setDate(oneDayBefore.getDate() - 1)

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
        validUntil: oneDayBefore.toISOString(),
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

    const { name, start, end, locationId, newLocation, venueId, newVenue, description, timezone } =
      ctx.request.body?.data || {}

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
      const locationData: Record<string, unknown> = {
        name: newLocation.name.trim(),
        country: newLocation.country,
      }

      // Add map location if provided
      if (newLocation.location?.geometry?.coordinates) {
        locationData.location = newLocation.location
      }

      const createdLocation = await strapi.documents("api::event-location.event-location").create({
        data: locationData,
      })
      finalLocationId = createdLocation.documentId

      strapi.log.info(`[Event] New location "${newLocation.name}" created by ${player.name}`)
    }

    // Resolve location to get the numeric ID
    const location = await strapi.documents("api::event-location.event-location").findOne({
      documentId: finalLocationId,
    })

    if (!location) {
      return ctx.badRequest("Location not found")
    }

    // Create venue if needed
    let venueNumericId: number | null = null
    if (newVenue?.name) {
      const createdVenue = await strapi.documents("api::venue.venue").create({
        data: {
          name: newVenue.name.trim(),
          addressDetails: newVenue.addressDetails || null,
        },
      })
      venueNumericId = Number(createdVenue.id)

      strapi.log.info(`[Event] New venue "${newVenue.name}" created by ${player.name}`)
    } else if (venueId) {
      const venue = await strapi.documents("api::venue.venue").findOne({
        documentId: venueId,
      })
      venueNumericId = venue ? Number(venue.id) : null
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
        ticketingMode: "none",
      } as any,
      status: "draft",
    })

    // Create default ticket types
    await this.createDefaultTickets(Number(event.id), startDate)

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
      fields: [
        "documentId",
        "slug",
        "name",
        "start",
        "end",
        "timezone",
        "eventStatus",
        "tagline",
        "description",
        "contactEmail",
        "ticketingMode",
      ],
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
            "defaultCurrency",
          ],
        },
        registration: {
          fields: ["id", "link", "widgetCode"],
        },
        finance: true,
        media: true,
        defaultImage: true,
        images: true,
        sponsorships: {
          populate: {
            sponsors: {
              populate: {
                logo: true,
              },
            },
          },
        },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access (host, mentor, or founder)
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event")
    }

    // Check if this event is published
    const publishedEvent = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      fields: ["documentId"],
      status: "published",
    })

    // Compute ticketingMode for backwards compatibility
    // If explicitly set to internal or external, use it; otherwise derive from legacy fields
    let ticketingMode = (event as any).ticketingMode
    if (ticketingMode !== "internal" && ticketingMode !== "external") {
      // Derive from legacy fields for existing events or when mode is "none"
      if ((event as any).stripeAccount) {
        ticketingMode = "internal"
      } else if ((event as any).registration?.link || (event as any).registration?.widgetCode) {
        ticketingMode = "external"
      } else {
        ticketingMode = "none"
      }
    }

    return ctx.send({
      data: {
        ...event,
        ticketingMode,
        isPublished: !!publishedEvent,
      },
    })
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
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
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

    // Handle location update (by documentId or create new)
    if (requestData.newLocation) {
      // Create new location
      const { newLocation } = requestData
      if (newLocation.name && newLocation.country) {
        const locationData: Record<string, unknown> = {
          name: newLocation.name.trim(),
          country: newLocation.country,
        }

        // Add map location if provided
        if (newLocation.location?.geometry?.coordinates) {
          locationData.location = newLocation.location
        }

        const createdLocation = await strapi
          .documents("api::event-location.event-location")
          .create({ data: locationData })

        updateData.location = createdLocation.id

        strapi.log.info(`[Event] New location "${newLocation.name}" created by ${player.name}`)
      }
    } else if (requestData.locationId) {
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

    // Handle ticketing mode
    if (requestData.ticketingMode !== undefined) {
      const mode = requestData.ticketingMode
      updateData.ticketingMode = mode
      // Only update registration data when in external mode
      // Preserve existing registration data when switching modes to allow toggling
      if (mode === "external" && requestData.registration) {
        updateData.registration = {
          link: requestData.registration.link || null,
          widgetCode: requestData.registration.widgetCode || null,
        }
      }
      // Note: We don't clear registration data when switching away from external
      // This allows users to switch back without losing their configuration
    }

    // Handle sponsorships update
    if (requestData.sponsorships !== undefined) {
      if (Array.isArray(requestData.sponsorships)) {
        // Transform sponsorships - sponsors are passed as documentIds
        const transformedSponsorships = await Promise.all(
          requestData.sponsorships.map(async (sponsorship: any) => {
            const sponsorConnections = await Promise.all(
              sponsorship.sponsors.map(async (sponsorDocId: string) => {
                const sponsor = await strapi.documents("api::sponsor.sponsor").findFirst({
                  filters: { documentId: { $eq: sponsorDocId } },
                  fields: ["id"],
                })
                return sponsor?.id
              })
            )
            return {
              ...(sponsorship.id ? { id: sponsorship.id } : {}),
              category: sponsorship.category,
              sponsors: sponsorConnections.filter(Boolean),
            }
          })
        )
        updateData.sponsorships = transformedSponsorships
      }
    }

    // Handle schedule/timetable update
    if (requestData.schedule !== undefined) {
      if (Array.isArray(requestData.schedule)) {
        // Helper to normalize time to HH:mm:ss format
        const normalizeTime = (time: string): string => {
          if (time.includes(":") && time.split(":").length >= 3) {
            return time.substring(0, 8)
          }
          return `${time}:00`
        }
        updateData.timetable = requestData.schedule.map((day: any) => ({
          day: day.day,
          description: day.description,
          timeslots: day.timeslots.map((slot: any) => ({
            time: normalizeTime(slot.time),
            description: slot.description,
          })),
        }))
      }
    }

    // Handle media links update
    if (requestData.mediaLinks !== undefined) {
      if (Array.isArray(requestData.mediaLinks)) {
        updateData.media = requestData.mediaLinks.map((item: any) => ({
          url: item.url,
          mediaType: item.mediaType,
        }))
      }
    }

    // Handle finance update
    if (requestData.finance !== undefined) {
      const { revenue, expenses, destination } = requestData.finance
      const resultAmount = Math.abs(revenue - expenses)
      const result = revenue >= expenses ? "Profit" : "Loss"
      updateData.finance = {
        revenue,
        expenses,
        destination: destination || "",
        result,
        resultAmount,
      }
    }

    // Update the event (publish immediately if already published)
    // Check if event is currently published
    const publishedEvent = await strapi.documents("api::event.event").findFirst({
      filters: { documentId: { $eq: event.documentId } },
      fields: ["documentId"],
      status: "published",
    })

    const updated = await strapi.documents("api::event.event").update({
      documentId: event.documentId,
      data: updateData,
      status: publishedEvent ? "published" : "draft",
    })

    strapi.log.info(`[Event] Event "${updated.name}" (${updated.slug}) updated by ${player.name}`)

    return ctx.send({
      data: {
        documentId: updated.documentId,
        slug: updated.slug,
        name: updated.name,
      },
    })
  },

  /**
   * Publish a draft event (organizer only)
   */
  async publishEvent(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user

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
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to publish this event")
    }

    // Publish the event using Strapi's document service
    await strapi.documents("api::event.event").publish({
      documentId: event.documentId,
    })

    strapi.log.info(`[Event] Event "${event.name}" (${event.slug}) published by ${player.name}`)

    return ctx.send({
      data: {
        documentId: event.documentId,
        slug: event.slug,
        name: event.name,
        isPublished: true,
      },
    })
  },

  /**
   * Unpublish an event (organizer only)
   */
  async unpublishEvent(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Fetch event to verify access (check published version)
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
      status: "published",
    })

    if (!event) {
      return ctx.notFound("Event not found or not published")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to unpublish this event")
    }

    // Unpublish the event using Strapi's document service
    await strapi.documents("api::event.event").unpublish({
      documentId: event.documentId,
    })

    strapi.log.info(`[Event] Event "${event.name}" (${event.slug}) unpublished by ${player.name}`)

    return ctx.send({
      data: {
        documentId: event.documentId,
        slug: event.slug,
        name: event.name,
        isPublished: false,
      },
    })
  },

  /**
   * Preview a draft event (organizer only)
   * Returns full event data similar to public event page, but for draft events
   */
  async previewEvent(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Fetch event with all details needed for preview (draft status)
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        defaultImage: true,
        images: true,
        location: { fields: ["slug", "name", "country", "location"] },
        venue: { fields: ["documentId", "name", "website", "location", "addressDetails"] },
        hosts: {
          fields: ["documentId", "slug", "name", "position"],
          populate: {
            avatar: { fields: ["name", "url"] },
            socialNetworks: true,
          },
        },
        mentors: {
          fields: ["documentId", "slug", "name", "position"],
          populate: {
            avatar: { fields: ["name", "url"] },
            socialNetworks: true,
          },
        },
        players: {
          fields: ["documentId", "slug", "name", "position"],
          populate: {
            avatar: { fields: ["name", "url"] },
          },
        },
        timetable: { populate: { timeslots: true } },
        registration: true,
        sponsorships: {
          populate: {
            sponsors: {
              populate: {
                logo: { fields: ["name", "url"] },
                socialNetworks: true,
              },
            },
          },
        },
        media: true,
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
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to preview this event")
    }

    // Check if this event is published
    const publishedEvent = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      fields: ["documentId"],
      status: "published",
    })

    // Compute ticketingMode for backwards compatibility
    // If explicitly set to internal or external, use it; otherwise derive from legacy fields
    let ticketingMode = (event as any).ticketingMode
    if (ticketingMode !== "internal" && ticketingMode !== "external") {
      // Derive from legacy fields for existing events or when mode is "none"
      if ((event as any).stripeAccount) {
        ticketingMode = "internal"
      } else if ((event as any).registration?.link || (event as any).registration?.widgetCode) {
        ticketingMode = "external"
      } else {
        ticketingMode = "none"
      }
    }

    return ctx.send({
      data: {
        ...event,
        ticketingMode,
        isPublished: !!publishedEvent,
        isDraft: !publishedEvent,
      },
    })
  },

  /**
   * Update event finance data (organizer only)
   */
  async updateFinance(ctx) {
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

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can update finance data")
    }

    // Fetch event to verify access
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        finance: true,
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event's finance")
    }

    // Validate finance data
    const { revenue, expenses, destination } = requestData || {}

    if (typeof revenue !== "number" || revenue < 0) {
      return ctx.badRequest("Revenue must be a positive number")
    }

    if (typeof expenses !== "number" || expenses < 0) {
      return ctx.badRequest("Expenses must be a positive number")
    }

    // Calculate result
    const resultAmount = Math.abs(revenue - expenses)
    const result = revenue >= expenses ? "Profit" : "Loss"

    // Validate destination if profit
    if (result === "Profit" && (!destination || typeof destination !== "string")) {
      return ctx.badRequest("Destination is required when there is a profit")
    }

    // Build finance component data
    const financeData = {
      revenue,
      expenses,
      destination: destination || "",
      result,
      resultAmount,
    }

    // Update the event with finance data
    // Note: Cast to any needed because Strapi 5 types don't properly handle component fields
    const _updated = await strapi.documents("api::event.event").update({
      documentId: event.documentId,
      data: {
        finance: financeData,
      } as any,
    })

    strapi.log.info(
      `[Event] Finance updated for "${event.name}" (${event.slug}) by ${player.name}: ${result} ${resultAmount}`
    )

    return ctx.send({
      data: financeData,
    })
  },

  /**
   * Update event media links (organizer only)
   */
  async updateMediaLinks(ctx) {
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

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can update media links")
    }

    // Fetch event to verify access
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        media: true,
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event's media links")
    }

    // Validate media data
    const { media } = requestData || {}

    if (!Array.isArray(media)) {
      return ctx.badRequest("Media must be an array")
    }

    // Validate each media link
    const validTypes = ["Photos", "Videos"]
    for (const item of media) {
      if (!item.url || typeof item.url !== "string") {
        return ctx.badRequest("Each media link must have a URL")
      }
      if (!item.mediaType || !validTypes.includes(item.mediaType)) {
        return ctx.badRequest("Each media link must have a valid type (Photos or Videos)")
      }
      // Basic URL validation
      try {
        new URL(item.url)
      } catch {
        return ctx.badRequest(`Invalid URL: ${item.url}`)
      }
    }

    // Build media component data
    const mediaData = media.map((item: any) => ({
      url: item.url,
      mediaType: item.mediaType,
    }))

    // Update the event with media data
    // Note: Cast to any needed because Strapi 5 types don't properly handle component fields
    const _updated = await strapi.documents("api::event.event").update({
      documentId: event.documentId,
      data: {
        media: mediaData,
      } as any,
    })

    strapi.log.info(
      `[Event] Media links updated for "${event.name}" (${event.slug}) by ${player.name}: ${media.length} links`
    )

    return ctx.send({
      data: mediaData,
    })
  },

  /**
   * Update event schedule/timetable (organizer only)
   */
  async updateSchedule(ctx) {
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

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can update the schedule")
    }

    // Fetch event to verify access
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        timetable: { populate: { timeslots: true } },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event's schedule")
    }

    // Validate timetable data
    const { timetable } = requestData || {}

    strapi.log.debug(`[Event] updateSchedule received data: ${JSON.stringify(requestData)}`)

    if (!Array.isArray(timetable)) {
      strapi.log.warn(`[Event] updateSchedule: timetable is not an array, got: ${typeof timetable}`)
      return ctx.badRequest("Timetable must be an array")
    }

    // Validate days of week
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    const usedDays = new Set()

    for (const day of timetable) {
      if (!day.day || !validDays.includes(day.day)) {
        return ctx.badRequest(`Invalid day: ${day.day}. Must be one of: ${validDays.join(", ")}`)
      }
      if (usedDays.has(day.day)) {
        return ctx.badRequest(`Duplicate day: ${day.day}`)
      }
      usedDays.add(day.day)

      if (!day.description || typeof day.description !== "string") {
        return ctx.badRequest(`Description is required for ${day.day}`)
      }

      if (!Array.isArray(day.timeslots) || day.timeslots.length === 0) {
        return ctx.badRequest(`At least one timeslot is required for ${day.day}`)
      }

      for (const slot of day.timeslots) {
        if (!slot.time || typeof slot.time !== "string") {
          return ctx.badRequest(`Time is required for each timeslot in ${day.day}`)
        }
        // Validate time format (HH:mm or HH:mm:ss or HH:mm:ss.SSS - Strapi time type stores with seconds)
        if (!/^\d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/.test(slot.time)) {
          return ctx.badRequest(`Invalid time format: ${slot.time}. Use HH:mm format`)
        }
        if (!slot.description || typeof slot.description !== "string") {
          return ctx.badRequest(`Description is required for each timeslot in ${day.day}`)
        }
      }
    }

    // Helper to normalize time to HH:mm:ss format for Strapi time type
    const normalizeTime = (time: string): string => {
      // If already has seconds, return as-is (strip milliseconds if present)
      if (time.includes(":") && time.split(":").length >= 3) {
        return time.substring(0, 8) // HH:mm:ss
      }
      // Add :00 seconds if only HH:mm
      return `${time}:00`
    }

    // Build timetable component data
    const timetableData = timetable.map((day: any) => ({
      day: day.day,
      description: day.description,
      timeslots: day.timeslots.map((slot: any) => ({
        time: normalizeTime(slot.time),
        description: slot.description,
      })),
    }))

    // Update the event with timetable data
    // Note: Cast to any needed because Strapi 5 types don't properly handle component fields
    const _updated = await strapi.documents("api::event.event").update({
      documentId: event.documentId,
      data: {
        timetable: timetableData,
      } as any,
    })

    strapi.log.info(
      `[Event] Schedule updated for "${event.name}" (${event.slug}) by ${player.name}: ${timetable.length} days`
    )

    return ctx.send({
      data: timetableData,
    })
  },

  /**
   * Upload image to event (organizer only)
   * Handles multipart/form-data with file and field name
   */
  async uploadImage(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can upload images")
    }

    // Fetch event to verify access (include location for folder organization)
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        location: { fields: ["slug", "name"] },
        defaultImage: true,
        images: true,
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to upload images for this event")
    }

    // Get file from request
    const { files } = ctx.request as any
    const uploadedFile = files?.files

    if (!uploadedFile) {
      return ctx.badRequest("No file uploaded")
    }

    // Get field from request body
    const field = ctx.request.body?.field
    if (!field || !["defaultImage", "images"].includes(field)) {
      return ctx.badRequest("Invalid field. Must be 'defaultImage' or 'images'")
    }

    // Validate image dimensions
    const filePath = uploadedFile.filepath || uploadedFile.path
    if (filePath) {
      const dimensions = getImageDimensions(filePath)
      if (dimensions) {
        if (field === "defaultImage") {
          // Default image must have 6:5 aspect ratio
          if (!isValidDefaultImageRatio(dimensions.width, dimensions.height)) {
            const currentRatio = (dimensions.width / dimensions.height).toFixed(2)
            return ctx.badRequest(
              `Default image must have a 6:5 aspect ratio (e.g., 600x500). Your image is ${dimensions.width}x${dimensions.height} (ratio: ${currentRatio}).`
            )
          }
        } else {
          // Gallery images: max dimension 1920px on longest edge
          const maxDimension = Math.max(dimensions.width, dimensions.height)
          if (maxDimension > GALLERY_IMAGE_MAX_DIMENSION) {
            return ctx.badRequest(
              `Gallery image dimensions are too large. Maximum dimension is ${GALLERY_IMAGE_MAX_DIMENSION}px. ` +
                `Your image is ${dimensions.width}x${dimensions.height}.`
            )
          }
        }
      }
    }

    try {
      // Get or create folder for event images: events/{locationSlug}/{eventSlug}
      const location = (event as any).location
      const locationSlug = location?.slug || "unknown-location"
      const folderId = await getOrCreateEventImageFolder(strapi, locationSlug, event.slug)

      // Upload file to Strapi media library
      const uploadService = strapi.plugins.upload.services.upload
      const [uploadedMedia] = await uploadService.upload({
        data: {
          fileInfo: {
            name: uploadedFile.name,
            caption: `Event ${event.name} ${field === "defaultImage" ? "default" : "gallery"} image`,
            folder: folderId,
          },
        },
        files: uploadedFile,
      })

      // Update event with new image
      if (field === "defaultImage") {
        await strapi.documents("api::event.event").update({
          documentId: event.documentId,
          data: {
            defaultImage: uploadedMedia.id,
          } as any,
        })
      } else {
        // Add to images array
        const currentImages = (event as any).images || []
        const imageIds = currentImages.map((img: any) => img.id)
        imageIds.push(uploadedMedia.id)

        await strapi.documents("api::event.event").update({
          documentId: event.documentId,
          data: {
            images: imageIds,
          } as any,
        })
      }

      strapi.log.info(
        `[Event] Image uploaded for "${event.name}" (${event.slug}) by ${player.name}: ${field}`
      )

      return ctx.send({
        data: {
          id: uploadedMedia.id,
          name: uploadedMedia.name,
          url: uploadedMedia.url,
          width: uploadedMedia.width,
          height: uploadedMedia.height,
          formats: uploadedMedia.formats,
        },
      })
    } catch (error) {
      strapi.log.error(`[Event] Image upload failed: ${error}`)
      return ctx.badRequest("Failed to upload image")
    }
  },

  /**
   * Set existing library image as event image (organizer only)
   */
  async setImageFromLibrary(ctx) {
    const { slug, field } = ctx.params
    const user = ctx.state.user
    const requestData = ctx.request.body?.data

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can manage images")
    }

    if (!["defaultImage", "images"].includes(field)) {
      return ctx.badRequest("Invalid field. Must be 'defaultImage' or 'images'")
    }

    const { fileId } = requestData || {}
    if (!fileId || typeof fileId !== "number") {
      return ctx.badRequest("fileId is required")
    }

    // Fetch event to verify access
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        images: true,
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to manage images for this event")
    }

    // Verify file exists
    const file = await strapi.plugins.upload.services.upload.findOne(fileId)
    if (!file) {
      return ctx.badRequest("File not found in media library")
    }

    try {
      // Update event with selected image
      if (field === "defaultImage") {
        await strapi.documents("api::event.event").update({
          documentId: event.documentId,
          data: {
            defaultImage: fileId,
          } as any,
        })
      } else {
        // Add to images array
        const currentImages = (event as any).images || []
        const imageIds = currentImages.map((img: any) => img.id)
        if (!imageIds.includes(fileId)) {
          imageIds.push(fileId)
        }

        await strapi.documents("api::event.event").update({
          documentId: event.documentId,
          data: {
            images: imageIds,
          } as any,
        })
      }

      strapi.log.info(
        `[Event] Image set from library for "${event.name}" (${event.slug}) by ${player.name}: ${field} = ${fileId}`
      )

      return ctx.send({
        data: {
          id: file.id,
          name: file.name,
          url: file.url,
          width: file.width,
          height: file.height,
          formats: file.formats,
        },
      })
    } catch (error) {
      strapi.log.error(`[Event] Set image from library failed: ${error}`)
      return ctx.badRequest("Failed to set image")
    }
  },

  /**
   * Remove image from event (organizer only)
   */
  async removeImage(ctx) {
    const { slug, field, fileId } = ctx.params
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can manage images")
    }

    if (!["defaultImage", "images"].includes(field)) {
      return ctx.badRequest("Invalid field. Must be 'defaultImage' or 'images'")
    }

    const numericFileId = Number.parseInt(fileId, 10)
    if (Number.isNaN(numericFileId)) {
      return ctx.badRequest("Invalid fileId")
    }

    // Fetch event to verify access
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        defaultImage: true,
        images: true,
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to manage images for this event")
    }

    try {
      if (field === "defaultImage") {
        // Clear default image (set to null)
        await strapi.documents("api::event.event").update({
          documentId: event.documentId,
          data: {
            defaultImage: null,
          } as any,
        })
      } else {
        // Remove from images array
        const currentImages = (event as any).images || []
        const imageIds = currentImages
          .map((img: any) => img.id)
          .filter((id: number) => id !== numericFileId)

        await strapi.documents("api::event.event").update({
          documentId: event.documentId,
          data: {
            images: imageIds,
          } as any,
        })
      }

      strapi.log.info(
        `[Event] Image removed from "${event.name}" (${event.slug}) by ${player.name}: ${field} = ${fileId}`
      )

      return ctx.send({
        data: { success: true },
      })
    } catch (error) {
      strapi.log.error(`[Event] Remove image failed: ${error}`)
      return ctx.badRequest("Failed to remove image")
    }
  },

  /**
   * Update event sponsorships (organizer only)
   */
  async updateSponsorships(ctx) {
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

    if (!this.isOrganizer(player.position)) {
      return ctx.forbidden("Only organizers can manage sponsorships")
    }

    const { sponsorships } = requestData || {}
    if (!Array.isArray(sponsorships)) {
      return ctx.badRequest("sponsorships must be an array")
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
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to manage sponsorships for this event")
    }

    // Validate sponsorships
    for (const sponsorship of sponsorships) {
      if (!sponsorship.category || typeof sponsorship.category !== "string") {
        return ctx.badRequest("Each sponsorship must have a category")
      }
      if (!Array.isArray(sponsorship.sponsors)) {
        return ctx.badRequest("Each sponsorship must have a sponsors array")
      }
    }

    try {
      // Transform sponsorships to Strapi format
      // Sponsors are passed as documentIds, need to look up their IDs
      const transformedSponsorships = await Promise.all(
        sponsorships.map(async (sponsorship: any) => {
          // For each sponsor documentId, look up the actual record
          const sponsorConnections = await Promise.all(
            sponsorship.sponsors.map(async (sponsorDocId: string) => {
              const sponsor = await strapi.documents("api::sponsor.sponsor").findFirst({
                filters: { documentId: { $eq: sponsorDocId } },
                fields: ["id"],
              })
              return sponsor?.id
            })
          )

          return {
            ...(sponsorship.id ? { id: sponsorship.id } : {}),
            category: sponsorship.category,
            sponsors: sponsorConnections.filter(Boolean),
          }
        })
      )

      // Update event with new sponsorships
      const updatedEvent = await strapi.documents("api::event.event").update({
        documentId: event.documentId,
        data: {
          sponsorships: transformedSponsorships,
        } as any,
        populate: {
          sponsorships: {
            populate: {
              sponsors: {
                populate: {
                  logo: true,
                },
              },
            },
          },
        },
      })

      const sponsorshipsData = (updatedEvent as any).sponsorships || []

      strapi.log.info(
        `[Event] Sponsorships updated for "${event.name}" (${event.slug}) by ${player.name}: ${sponsorships.length} categories`
      )

      return ctx.send({
        data: sponsorshipsData,
      })
    } catch (error) {
      strapi.log.error(`[Event] Update sponsorships failed: ${error}`)
      return ctx.badRequest("Failed to update sponsorships")
    }
  },

  /**
   * Get revenue analytics for an event
   * Aggregates ticket order data for dashboards
   */
  async getRevenueAnalytics(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the event and verify organizer access
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
        ticketTypes: { fields: ["documentId", "name", "price", "currency"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to view this event's revenue analytics")
    }

    // Fetch all orders for this event
    const orders = await strapi.documents("api::ticket-order.ticket-order").findMany({
      filters: {
        event: { documentId: eventId },
      },
      populate: {
        tickets: { fields: ["documentId"] },
        discountCode: { fields: ["documentId", "code"] },
      },
    })

    // Initialize aggregation data
    const statusCounts: Record<string, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      partially_refunded: { count: 0, amount: 0 },
      expired: { count: 0, amount: 0 },
    }

    const ticketTypeRevenue: Record<
      string,
      { name: string; price: number; quantity: number; revenue: number }
    > = {}
    const timelineData: Record<string, { orders: number; revenue: number }> = {}

    let totalRevenue = 0
    let totalRefunded = 0
    let totalTickets = 0
    let totalDiscounted = 0
    let codesUsedCount = 0
    let currency = "EUR"

    // Process each order
    for (const order of orders as any[]) {
      const status = order.orderStatus || "pending"
      const amount = order.totalAmount || 0
      currency = order.currency || currency

      // Aggregate by status
      if (statusCounts[status]) {
        statusCounts[status].count++
        statusCounts[status].amount += amount
      }

      // Only count paid orders for revenue
      if (status === "paid" || status === "partially_refunded") {
        totalRevenue += amount
        totalTickets += order.tickets?.length || 0

        // Track discount usage
        if (order.discountAmount && order.discountAmount > 0) {
          totalDiscounted += order.discountAmount
          if (order.discountCode) {
            codesUsedCount++
          }
        }

        // Aggregate by date (for timeline)
        if (order.paidAt) {
          const dateKey = order.paidAt.split("T")[0] // YYYY-MM-DD
          if (!timelineData[dateKey]) {
            timelineData[dateKey] = { orders: 0, revenue: 0 }
          }
          timelineData[dateKey].orders++
          timelineData[dateKey].revenue += amount
        }

        // Aggregate by ticket type (from ticketDetails JSON)
        const ticketDetails = order.ticketDetails || []
        for (const detail of ticketDetails) {
          const typeId = detail.ticketTypeId
          if (!ticketTypeRevenue[typeId]) {
            ticketTypeRevenue[typeId] = {
              name: detail.ticketTypeName || "Unknown",
              price: detail.unitPrice || 0,
              quantity: 0,
              revenue: 0,
            }
          }
          ticketTypeRevenue[typeId].quantity += detail.quantity || 0
          ticketTypeRevenue[typeId].revenue += (detail.unitPrice || 0) * (detail.quantity || 0)
        }
      }

      // Track refunds
      if (status === "refunded" || status === "partially_refunded") {
        totalRefunded += order.refundAmount || 0
      }
    }

    // Calculate summary metrics
    const paidOrderCount = statusCounts.paid.count + statusCounts.partially_refunded.count
    const averageOrderValue = paidOrderCount > 0 ? totalRevenue / paidOrderCount : 0
    const netRevenue = totalRevenue - totalRefunded

    // Convert timeline to sorted array
    const timeline = Object.entries(timelineData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Convert ticket type revenue to array
    const byTicketType = Object.entries(ticketTypeRevenue)
      .map(([ticketTypeId, data]) => ({
        ticketTypeId,
        ticketTypeName: data.name,
        price: data.price,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return ctx.send({
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalRefunded: Math.round(totalRefunded * 100) / 100,
          netRevenue: Math.round(netRevenue * 100) / 100,
          totalOrders: paidOrderCount,
          totalTickets,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          currency,
        },
        byStatus: statusCounts,
        byTicketType,
        timeline,
        discountUsage: {
          totalDiscounted: Math.round(totalDiscounted * 100) / 100,
          codesUsed: codesUsedCount,
        },
      },
    })
  },

  /**
   * Get participants (tickets) for an event (organizer only)
   */
  async getParticipants(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params
    const { page = 1, pageSize = 50 } = ctx.request.query

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the event and verify organizer access
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to view participants for this event")
    }

    // Fetch participants (tickets) for this event with valid/used status
    const tickets = await strapi.documents("api::ticket.ticket").findMany({
      filters: {
        event: { documentId: eventId },
        ticketStatus: { $in: ["valid", "used"] },
      },
      populate: {
        ticketType: { fields: ["documentId", "name"] },
        order: {
          fields: [
            "documentId",
            "orderNumber",
            "purchaserName",
            "purchaserEmail",
            "orderStatus",
            "paidAt",
          ],
        },
        player: { fields: ["documentId", "name"] },
        attendeeInfo: true,
      },
      sort: { createdAt: "desc" },
      start: (Number.parseInt(page as string, 10) - 1) * Number.parseInt(pageSize as string, 10),
      limit: Number.parseInt(pageSize as string, 10),
    })

    // Get total count for pagination
    const totalTickets = await strapi.documents("api::ticket.ticket").findMany({
      filters: {
        event: { documentId: eventId },
        ticketStatus: { $in: ["valid", "used"] },
      },
      fields: ["documentId"],
    })

    const total = totalTickets.length
    const pageNum = Number.parseInt(page as string, 10)
    const pageSizeNum = Number.parseInt(pageSize as string, 10)

    return ctx.send({
      data: {
        participants: tickets.map((ticket: any) => ({
          documentId: ticket.documentId,
          ticketCode: ticket.ticketCode,
          ticketStatus: ticket.ticketStatus,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail,
          attendeeInfo: ticket.attendeeInfo,
          checkedInAt: ticket.checkedInAt,
          ticketType: ticket.ticketType
            ? { documentId: ticket.ticketType.documentId, name: ticket.ticketType.name }
            : null,
          order: ticket.order
            ? {
                documentId: ticket.order.documentId,
                orderNumber: ticket.order.orderNumber,
                purchaserName: ticket.order.purchaserName,
                purchaserEmail: ticket.order.purchaserEmail,
                orderStatus: ticket.order.orderStatus,
                paidAt: ticket.order.paidAt,
              }
            : null,
          player: ticket.player
            ? {
                documentId: ticket.player.documentId,
                name: ticket.player.name,
              }
            : null,
          createdAt: ticket.createdAt,
        })),
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
          total,
        },
      },
    })
  },

  /**
   * Get participant statistics for an event (organizer only)
   */
  async getParticipantStats(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the event and verify organizer access
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to view participant stats for this event")
    }

    // Get total valid/used tickets
    const totalTickets = await strapi.documents("api::ticket.ticket").findMany({
      filters: {
        event: { documentId: eventId },
        ticketStatus: { $in: ["valid", "used"] },
      },
      fields: ["documentId"],
    })

    // Get checked-in tickets
    const checkedInTickets = await strapi.documents("api::ticket.ticket").findMany({
      filters: {
        event: { documentId: eventId },
        ticketStatus: { $eq: "used" },
      },
      fields: ["documentId"],
    })

    const total = totalTickets.length
    const checkedIn = checkedInTickets.length

    return ctx.send({
      data: {
        total,
        checkedIn,
        pending: total - checkedIn,
      },
    })
  },

  /**
   * Add a participant to an event (organizer only)
   *
   * Enrolls a player as an attendee without a Stripe purchase — e.g. when
   * ticketing is handled by an external tool. The player is:
   * - added to event.players (public attendee list + attendance/position logic)
   * - issued a free "external" ticket (no order) so they show up in the
   *   participants list and can be checked in at the door.
   *
   * Body: { playerDocumentId?: string, newPlayer?: { name, email?, company? } }
   */
  async addParticipant(ctx) {
    const user = ctx.state.user
    const { eventId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the event and verify organizer access.
    // NOTE: like the sibling participant endpoints (getParticipants), this operates on
    // the organizer's event whether draft or published — addPlayerToEventAttendees below
    // syncs the attendee into BOTH versions, and tickets are linked by event regardless.
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    if (!this.isEventOrganizer(event, player)) {
      return ctx.forbidden("You don't have access to add participants to this event")
    }

    const body = ctx.request.body?.data || ctx.request.body || {}
    const playerDocumentId: string | undefined = body.playerDocumentId
    const newPlayer = body.newPlayer as
      | { name?: string; email?: string; company?: string }
      | undefined

    if (!playerDocumentId && !newPlayer?.name) {
      return ctx.badRequest("Provide either playerDocumentId or newPlayer.name")
    }

    // Validate new-player name + optional email up front (fail fast, before any writes).
    let newPlayerName = ""
    let newPlayerEmail: string | null = null
    if (!playerDocumentId) {
      newPlayerName = (newPlayer?.name || "").trim()
      if (newPlayerName.length < 2) {
        return ctx.badRequest("Name is required and must be at least 2 characters")
      }
      if (newPlayer?.email?.trim()) {
        const emailResult = validateEmail(newPlayer.email.trim())
        if (!emailResult.valid) {
          return ctx.badRequest(emailResult.error || "Invalid email address")
        }
        newPlayerEmail = emailResult.email
      }
    }

    // Serialize concurrent adds to the same event with a distributed lock (shared with
    // removeParticipant) to close the check-then-create race on the duplicate-ticket guard
    // and the find-or-create of the per-event "external" ticket type.
    // CAVEAT: when Redis is unavailable, acquireLock returns a per-INSTANCE fallback token, so
    // there is NO cross-container serialization in that degraded mode — two containers could
    // both pass the guards and double-enroll. There is no DB unique-constraint backstop today
    // (the ticket-type→event relation lives in a Strapi link table); if double-enrollment in
    // Redis-down deployments becomes a concern, add one via a migration.
    const lockName = `event-participants:${eventId}`
    const lockToken = await acquireLock(lockName, 30_000)
    if (!lockToken) {
      return ctx.badRequest("Another participant is being added to this event. Please retry.")
    }

    // Track what THIS request created so we can roll it back if a later step throws:
    // the player (if newly created) and the attendee-list membership (if newly added).
    let createdPlayerDocId: string | null = null
    let addedAttendeePlayerDocId: string | null = null

    try {
      // 1. Resolve the participant's player profile (existing or newly created)
      let participantPlayer: any
      if (playerDocumentId) {
        participantPlayer = await strapi.documents("api::player.player").findOne({
          documentId: playerDocumentId,
          populate: { user: { fields: ["email"] } },
        })
        if (!participantPlayer) {
          return ctx.notFound("Player not found")
        }
      } else {
        // player.name is unique — reject exact matches so the organizer picks the existing one.
        const existing = await strapi.documents("api::player.player").findMany({
          filters: { name: { $eqi: newPlayerName } },
          fields: ["documentId"],
        })
        if (existing.length > 0) {
          return ctx.badRequest(
            "A player with this name already exists. Select the existing player instead."
          )
        }
        // The player schema marks `slug` required, and Strapi 5's Document Service validates
        // required fields BEFORE the `beforeCreate` lifecycle runs — so the lifecycle's slug
        // derivation can't satisfy validation and we MUST set the slug on create (every other
        // player-create path does too). We use the same toSlug(name) the lifecycle would, so the
        // two agree. Two names that slugify identically ("Rémi" vs "Remi") still collide on the
        // slug unique constraint; surface that as a clear 400 instead of a 500. Retrying is
        // pointless — the slug would be regenerated the same.
        try {
          participantPlayer = await strapi.documents("api::player.player").create({
            data: {
              name: newPlayerName,
              slug: toSlug(newPlayerName),
              position: "Player",
              company: newPlayer?.company?.trim() || null,
            } as any,
          })
        } catch (err) {
          if (/unique|duplicate|already exists/i.test(String(err))) {
            strapi.log.warn(`[Event] Name/slug conflict creating player "${newPlayerName}": ${err}`)
            return ctx.badRequest(
              "A player with this name (or a very similar one) already exists. Select the existing player instead."
            )
          }
          strapi.log.error(`[Event] Failed to create player "${newPlayerName}": ${err}`)
          throw err
        }
        createdPlayerDocId = participantPlayer.documentId
        strapi.log.info(
          `[Event] Created player ${participantPlayer.documentId} ("${newPlayerName}") while adding participant to "${event.name}" by ${player.name}`
        )
      }

      // 2. Duplicate guard — already enrolled (valid/used ticket) for this event?
      const existingTickets = await strapi.documents("api::ticket.ticket").findMany({
        filters: {
          event: { documentId: eventId },
          player: { documentId: participantPlayer.documentId },
          ticketStatus: { $in: ["valid", "used"] },
        },
        fields: ["documentId"],
      })
      if (existingTickets.length > 0) {
        return ctx.badRequest("This player is already a participant of this event")
      }

      // 3. Find-or-create the per-event "external" ticket type (inactive → hidden from sale)
      let externalType = await strapi.documents("api::ticket-type.ticket-type").findFirst({
        filters: {
          event: { documentId: eventId },
          name: { $eqi: EXTERNAL_TICKET_TYPE_NAME },
        },
      })
      if (!externalType) {
        // Inherit currency from an existing ticket type, else default to EUR
        const anyType = await strapi.documents("api::ticket-type.ticket-type").findFirst({
          filters: { event: { documentId: eventId } },
          fields: ["currency"],
        })
        externalType = await strapi.documents("api::ticket-type.ticket-type").create({
          data: {
            name: EXTERNAL_TICKET_TYPE_NAME,
            price: 0,
            currency: (anyType as any)?.currency || "EUR",
            isActive: false,
            event: event.id,
          } as any,
        })
      }

      // 4. Add the player to the event attendee list FIRST (draft + published, dedup-safe).
      // Minting the ticket LAST means a failure in this step leaves no orphan "valid" ticket
      // that the duplicate guard (step 2) would later treat as "already a participant",
      // blocking retries. addPlayerToEventAttendees is idempotent. We record whether WE added
      // the membership (vs the player already attending) so the catch can reverse only our own
      // change — otherwise a mint failure would orphan the player on event.players (visible
      // publicly) with no ticket.
      const attendeeWasAdded = await addPlayerToEventAttendees(
        strapi,
        participantPlayer.documentId,
        { documentId: event.documentId, id: Number(event.id) },
        "[Event]"
      )
      if (attendeeWasAdded) {
        addedAttendeePlayerDocId = participantPlayer.documentId
      }

      // 5. Mint a free ticket (no order) so the attendee appears in the roster
      const attendeeName = participantPlayer.name
      const attendeeEmail = newPlayerEmail || (participantPlayer as any).user?.email || null

      const ticket = await strapi.documents("api::ticket.ticket").create({
        data: {
          ticketCode: generateTicketCode(),
          ticketStatus: "valid",
          attendeeName,
          attendeeEmail,
          ticketType: externalType.id,
          player: participantPlayer.id,
          event: event.id,
        } as any,
      })

      strapi.log.info(
        `[Event] Participant added to "${event.name}" by ${player.name}: ${attendeeName} (${ticket.ticketCode})`
      )

      // Refresh the public event page: adding the attendee only updates the player record
      // (which revalidates the player page via its lifecycle), so the event's attendee list
      // would otherwise stay stale until the next event edit. Revalidate the event explicitly.
      triggerContentRevalidation(
        strapi,
        "api::event.event",
        { slug: (event as any).slug },
        "update"
      )

      return ctx.send({
        data: {
          participant: {
            documentId: ticket.documentId,
            ticketCode: ticket.ticketCode,
            ticketStatus: ticket.ticketStatus,
            attendeeName,
            attendeeEmail,
            ticketType: { documentId: externalType.documentId, name: externalType.name },
            player: { documentId: participantPlayer.documentId, name: participantPlayer.name },
            createdAt: (ticket as any).createdAt,
          },
        },
      })
    } catch (err) {
      // Roll back, in reverse order, only what THIS request created when a later step threw
      // (e.g. a transient ticket-mint failure). Returned errors (ctx.badRequest/notFound)
      // don't reach here — only thrown ones do.
      if (addedAttendeePlayerDocId) {
        // Reverse the attendee-list membership we added in step 4 so the player isn't left
        // publicly enrolled with no ticket. Deleting a newly-created player below would also
        // drop the relation, but existing players must be detached explicitly.
        await removePlayerFromEventAttendees(
          strapi,
          addedAttendeePlayerDocId,
          { documentId: event.documentId },
          "[Event]"
        ).catch(() => {})
      }
      if (createdPlayerDocId) {
        await strapi
          .documents("api::player.player")
          .delete({ documentId: createdPlayerDocId })
          .catch(() => {})
        strapi.log.warn(
          `[Event] Rolled back orphan player ${createdPlayerDocId} after add failed: ${err}`
        )
      }
      throw err
    } finally {
      await releaseLock(lockName, lockToken)
    }
  },

  /**
   * Remove a manually-added participant from an event (organizer only).
   *
   * Only participants added manually — a comp ticket with no order (no Stripe
   * purchase) — can be removed. The comp ticket is deleted and the player is
   * removed from event.players unless they still hold another valid/used ticket
   * for this event. Purchased/self-registered tickets must go through refund.
   */
  async removeParticipant(ctx) {
    const user = ctx.state.user
    const { eventId, ticketId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    if (!this.isEventOrganizer(event, player)) {
      return ctx.forbidden("You don't have access to remove participants from this event")
    }

    // Acquire the per-event lock BEFORE reading the ticket: two concurrent deletes must not
    // both pass the guards and then double-delete (the second would no-op and return a
    // spurious success). Shared with addParticipant so add/remove are serialized.
    const lockName = `event-participants:${eventId}`
    const lockToken = await acquireLock(lockName, 30_000)
    if (!lockToken) {
      return ctx.badRequest(
        "Another participant change is in progress for this event. Please retry."
      )
    }

    try {
      const ticket = await strapi.documents("api::ticket.ticket").findOne({
        documentId: ticketId,
        populate: {
          event: { fields: ["documentId"] },
          order: { fields: ["documentId"] },
          player: { fields: ["documentId"] },
        },
      })

      if (!ticket) {
        return ctx.notFound("Ticket not found")
      }
      if ((ticket as any).event?.documentId !== eventId) {
        return ctx.badRequest("Ticket does not belong to this event")
      }
      // Only manually-added participants (comp ticket, no Stripe order) can be removed.
      if ((ticket as any).order) {
        return ctx.badRequest(
          "Only manually-added participants can be removed; purchased tickets must be refunded."
        )
      }

      const participantPlayerDocId = (ticket as any).player?.documentId

      await strapi.documents("api::ticket.ticket").delete({ documentId: ticketId })

      // The ticket is now gone (point of no return). The attendee cleanup below is
      // best-effort: without DB transactions it can't be made atomic, so a transient
      // failure here is logged for operational visibility rather than failing the
      // request — the primary action (deleting the comp ticket) already succeeded.
      try {
        if (participantPlayerDocId) {
          // Remove from event.players only if no other valid/used ticket remains for this
          // player (e.g. they could also hold a separate purchased ticket).
          const remaining = await strapi.documents("api::ticket.ticket").findMany({
            filters: {
              event: { documentId: eventId },
              player: { documentId: participantPlayerDocId },
              ticketStatus: { $in: ["valid", "used"] },
            },
            fields: ["documentId"],
          })
          if (remaining.length === 0) {
            await removePlayerFromEventAttendees(
              strapi,
              participantPlayerDocId,
              { documentId: event.documentId },
              "[Event]"
            )
          }
        } else {
          strapi.log.warn(
            `[Event] Removed ticket ${ticket.ticketCode} had no linked player; event attendee list left unchanged`
          )
        }
      } catch (err) {
        strapi.log.warn(
          `[Event] Ticket ${ticket.ticketCode} deleted but attendee cleanup failed (player still on event.players): ${err}`
        )
      }

      strapi.log.info(
        `[Event] Participant removed from "${event.name}" by ${player.name}: ${ticket.ticketCode}`
      )

      // Refresh the public event page so the removed attendee disappears from its list
      // (see addParticipant — the attendee change lives on the player record, not the event).
      triggerContentRevalidation(
        strapi,
        "api::event.event",
        { slug: (event as any).slug },
        "update"
      )

      return ctx.send({ data: { documentId: ticketId, removed: true } })
    } finally {
      await releaseLock(lockName, lockToken)
    }
  },

  /**
   * Check in a participant (organizer only)
   */
  async checkInParticipant(ctx) {
    const user = ctx.state.user
    const { eventId, ticketId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the event and verify organizer access
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to check in participants for this event")
    }

    // Find the ticket and verify it belongs to this event
    const ticket = await strapi.documents("api::ticket.ticket").findOne({
      documentId: ticketId,
      populate: {
        event: { fields: ["documentId"] },
      },
    })

    if (!ticket) {
      return ctx.notFound("Ticket not found")
    }

    if ((ticket as any).event?.documentId !== eventId) {
      return ctx.badRequest("Ticket does not belong to this event")
    }

    if (ticket.ticketStatus !== "valid") {
      return ctx.badRequest(`Cannot check in ticket with status: ${ticket.ticketStatus}`)
    }

    // Update ticket to checked in
    const updated = await strapi.documents("api::ticket.ticket").update({
      documentId: ticketId,
      data: {
        ticketStatus: "used",
        checkedInAt: new Date().toISOString(),
      } as any,
    })

    strapi.log.info(
      `[Event] Participant checked in for "${event.name}" by ${player.name}: ${ticket.ticketCode}`
    )

    return ctx.send({
      data: {
        documentId: updated.documentId,
        ticketStatus: updated.ticketStatus,
        checkedInAt: (updated as any).checkedInAt,
      },
    })
  },

  /**
   * Update event translation for a specific locale (organizer only)
   * Uses the Document Service directly to create/update locale entries.
   */
  async updateTranslation(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user
    const { locale, description } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    if (!locale || typeof locale !== "string") {
      return ctx.badRequest("locale is required")
    }

    if (typeof description !== "string") {
      return ctx.badRequest("description is required")
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
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to edit this event")
    }

    // Check if event is published (to maintain correct status)
    const publishedEvent = await strapi.documents("api::event.event").findOne({
      documentId: event.documentId,
      fields: ["documentId"],
      status: "published",
    })

    // Include name and slug to satisfy required field validation when Strapi creates
    // a new locale entry. copyNonLocalizedFields skips localized+required fields (name)
    // and uid fields (slug), so we must supply them explicitly.
    const updateData: any = { name: event.name, slug: event.slug, description }
    strapi.log.info(
      `[Event] Updating translation for documentId=${event.documentId} locale=${locale} status=${publishedEvent ? "published" : "draft"}`
    )

    try {
      // Single update call with correct status — avoids a separate publish() step
      // which can re-publish all locales and disrupt image relations
      const updated = await strapi.documents("api::event.event").update({
        documentId: event.documentId,
        locale,
        data: updateData,
        status: publishedEvent ? "published" : "draft",
      } as any)

      strapi.log.info(
        `[Event] Translation updated for "${event.name}" (${event.slug}) locale=${locale} resultLocale=${(updated as any).locale} by ${player.name}`
      )

      return ctx.send({
        data: {
          documentId: updated.documentId,
          locale: (updated as any).locale,
          description: updated.description,
        },
      })
    } catch (error) {
      strapi.log.error(
        `[Event] Translation update failed for "${event.name}" (${event.slug}) locale=${locale}: ${error}`
      )
      return ctx.badRequest("Failed to save translation")
    }
  },

  /**
   * Get event description for a specific locale (organizer only)
   */
  async getTranslation(ctx) {
    const { slug } = ctx.params
    const user = ctx.state.user
    const locale = ctx.query.locale as string

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    if (!locale) {
      return ctx.badRequest("locale query param is required")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Fetch event in the requested locale
    const event = await strapi.documents("api::event.event").findFirst({
      filters: { slug: { $eq: slug } },
      fields: ["documentId", "description", "locale"],
      locale,
    })

    if (!event) {
      return ctx.send({ data: { description: "", exists: false } })
    }

    // Check if we actually got the requested locale or a fallback
    const exists = (event as any).locale === locale

    return ctx.send({
      data: {
        description: exists ? event.description || "" : "",
        exists,
      },
    })
  },

  /**
   * Undo check-in for a participant (organizer only)
   */
  async undoCheckIn(ctx) {
    const user = ctx.state.user
    const { eventId, ticketId } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const player = await this.getLinkedPlayer(user.id)
    if (!player) {
      return ctx.forbidden("You must have a linked player profile")
    }

    // Find the event and verify organizer access
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: {
        hosts: { fields: ["documentId"] },
        mentors: { fields: ["documentId"] },
      },
    })

    if (!event) {
      return ctx.notFound("Event not found")
    }

    // Verify organizer access
    const isHost = (event as any).hosts?.some((h: any) => h.documentId === player.documentId)
    const isMentor = (event as any).mentors?.some((m: any) => m.documentId === player.documentId)
    const isFounder = player.position === "Founder"

    if (!isHost && !isMentor && !isFounder) {
      return ctx.forbidden("You don't have access to manage participants for this event")
    }

    // Find the ticket and verify it belongs to this event
    const ticket = await strapi.documents("api::ticket.ticket").findOne({
      documentId: ticketId,
      populate: {
        event: { fields: ["documentId"] },
      },
    })

    if (!ticket) {
      return ctx.notFound("Ticket not found")
    }

    if ((ticket as any).event?.documentId !== eventId) {
      return ctx.badRequest("Ticket does not belong to this event")
    }

    if (ticket.ticketStatus !== "used") {
      return ctx.badRequest(`Cannot undo check-in for ticket with status: ${ticket.ticketStatus}`)
    }

    // Update ticket to valid (undo check-in)
    const updated = await strapi.documents("api::ticket.ticket").update({
      documentId: ticketId,
      data: {
        ticketStatus: "valid",
        checkedInAt: null,
      } as any,
    })

    strapi.log.info(
      `[Event] Participant check-in undone for "${event.name}" by ${player.name}: ${ticket.ticketCode}`
    )

    return ctx.send({
      data: {
        documentId: updated.documentId,
        ticketStatus: updated.ticketStatus,
        checkedInAt: null,
      },
    })
  },
})
