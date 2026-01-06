/**
 * Custom controller for event location management
 * Allows organizers to manage event locations
 */

import type { Core } from "@strapi/strapi"
import slugify from "slugify"

interface LocationData {
  name?: string
  country?: string
  location?: {
    geometry?: {
      coordinates?: [number, number]
      type?: string
    }
    place_name?: string
  } | null
}

/**
 * Check if user is an organizer (Host, Mentor, or Founder)
 */
async function requireOrganizer(strapi: Core.Strapi, ctx: any): Promise<boolean> {
  const user = ctx.state.user

  if (!user) {
    ctx.unauthorized("You must be logged in")
    return false
  }

  const userWithPlayer = await strapi
    .documents("plugin::users-permissions.user")
    .findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

  if (!userWithPlayer?.player) {
    ctx.forbidden("You must have a linked player profile")
    return false
  }

  const position = userWithPlayer.player.position

  if (position === "Player") {
    ctx.forbidden("Only organizers can manage event locations")
    return false
  }

  return true
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * List all event locations with pagination, search, and country filter
   */
  async list(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { search, country, page = 1, pageSize = 25 } = ctx.query

    try {
      // Fetch all locations with events count
      const allLocations = await strapi.documents("api::event-location.event-location").findMany({
        populate: {
          events: {
            fields: ["id"],
          },
        },
      })

      // Apply filters
      let filteredLocations = allLocations

      // Search filter (case-insensitive)
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchLower = search.trim().toLowerCase()
        filteredLocations = filteredLocations.filter((location) =>
          location.name.toLowerCase().includes(searchLower)
        )
      }

      // Country filter
      if (country && typeof country === "string" && country.length > 0) {
        filteredLocations = filteredLocations.filter(
          (location) => location.country === country
        )
      }

      // Sort by name
      filteredLocations.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))

      // Calculate pagination
      const total = filteredLocations.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const paginatedLocations = filteredLocations.slice(startIndex, startIndex + Number(pageSize))

      // Format response
      const formattedLocations = paginatedLocations.map((location) => ({
        documentId: location.documentId,
        name: location.name,
        slug: location.slug,
        country: location.country,
        eventsCount: location.events?.length || 0,
      }))

      return ctx.send({
        data: formattedLocations,
        meta: {
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            pageCount: Math.ceil(total / Number(pageSize)),
            total,
          },
        },
      })
    } catch (error) {
      strapi.log.error(`[EventLocation] Failed to list locations: ${error}`)
      return ctx.internalServerError("Failed to list event locations")
    }
  },

  /**
   * Get a single event location for editing
   */
  async findOne(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: locationId } = ctx.params

    if (!locationId) {
      return ctx.badRequest("Location ID is required")
    }

    try {
      const location = await strapi.documents("api::event-location.event-location").findOne({
        documentId: locationId,
        populate: {
          events: {
            fields: ["id", "name", "slug"],
          },
        },
      })

      if (!location) {
        return ctx.notFound("Event location not found")
      }

      return ctx.send({
        data: {
          documentId: location.documentId,
          name: location.name,
          slug: location.slug,
          country: location.country,
          location: location.location,
          eventsCount: location.events?.length || 0,
          events: location.events || [],
        },
      })
    } catch (error) {
      strapi.log.error(`[EventLocation] Failed to get location: ${error}`)
      return ctx.internalServerError("Failed to get event location")
    }
  },

  /**
   * Create a new event location
   */
  async create(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const data: LocationData = ctx.request.body?.data || {}

    if (!data.name || data.name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    if (!data.country || data.country.trim().length === 0) {
      return ctx.badRequest("Country is required")
    }

    try {
      // Check for duplicate name
      const existing = await strapi.documents("api::event-location.event-location").findMany({
        filters: {
          name: { $eqi: data.name.trim() },
        },
      })

      if (existing.length > 0) {
        return ctx.badRequest("An event location with this name already exists")
      }

      // Generate slug from name
      const slug = slugify(data.name.trim(), { lower: true, strict: true })

      // Create the location
      const newLocation = await strapi.documents("api::event-location.event-location").create({
        data: {
          name: data.name.trim(),
          slug,
          country: data.country.trim().toUpperCase(),
          location: data.location || null,
        },
      })

      strapi.log.info(`[EventLocation] Created location: ${newLocation.name} (${newLocation.documentId})`)

      return ctx.send({
        data: {
          documentId: newLocation.documentId,
          name: newLocation.name,
          slug: newLocation.slug,
          country: newLocation.country,
          location: newLocation.location,
          eventsCount: 0,
        },
      })
    } catch (error) {
      strapi.log.error(`[EventLocation] Failed to create location: ${error}`)
      return ctx.internalServerError("Failed to create event location")
    }
  },

  /**
   * Update an event location
   */
  async update(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: locationId } = ctx.params
    const data: LocationData = ctx.request.body?.data || {}

    if (!locationId) {
      return ctx.badRequest("Location ID is required")
    }

    try {
      // Find existing location
      const existingLocation = await strapi.documents("api::event-location.event-location").findOne({
        documentId: locationId,
      })

      if (!existingLocation) {
        return ctx.notFound("Event location not found")
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {}

      if (data.name !== undefined && data.name.trim().length > 0) {
        // Check for duplicate name (excluding current location)
        const duplicates = await strapi.documents("api::event-location.event-location").findMany({
          filters: {
            name: { $eqi: data.name.trim() },
            documentId: { $ne: locationId },
          },
        })

        if (duplicates.length > 0) {
          return ctx.badRequest("An event location with this name already exists")
        }

        updateData.name = data.name.trim()
        // Regenerate slug when name changes
        updateData.slug = slugify(data.name.trim(), { lower: true, strict: true })
      }

      if (data.country !== undefined) {
        updateData.country = data.country.trim().toUpperCase()
      }

      if (data.location !== undefined) {
        updateData.location = data.location
      }

      // Update the location
      const updatedLocation = await strapi.documents("api::event-location.event-location").update({
        documentId: locationId,
        data: updateData,
        populate: {
          events: {
            fields: ["id"],
          },
        },
      })

      strapi.log.info(`[EventLocation] Updated location: ${updatedLocation.name} (${locationId})`)

      return ctx.send({
        data: {
          documentId: updatedLocation.documentId,
          name: updatedLocation.name,
          slug: updatedLocation.slug,
          country: updatedLocation.country,
          location: updatedLocation.location,
          eventsCount: updatedLocation.events?.length || 0,
        },
      })
    } catch (error) {
      strapi.log.error(`[EventLocation] Failed to update location: ${error}`)
      return ctx.internalServerError("Failed to update event location")
    }
  },

  /**
   * Delete an event location (only if it has no events)
   */
  async delete(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: locationId } = ctx.params

    if (!locationId) {
      return ctx.badRequest("Location ID is required")
    }

    try {
      // Find location with events
      const location = await strapi.documents("api::event-location.event-location").findOne({
        documentId: locationId,
        populate: {
          events: {
            fields: ["id", "name"],
          },
        },
      })

      if (!location) {
        return ctx.notFound("Event location not found")
      }

      // Check if location has events
      if (location.events && location.events.length > 0) {
        return ctx.badRequest(
          `Cannot delete this location because it has ${location.events.length} event(s) attached. Please reassign or delete those events first.`
        )
      }

      // Delete the location
      await strapi.documents("api::event-location.event-location").delete({
        documentId: locationId,
      })

      strapi.log.info(`[EventLocation] Deleted location: ${location.name} (${locationId})`)

      return ctx.send({
        data: {
          documentId: locationId,
          deleted: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[EventLocation] Failed to delete location: ${error}`)
      return ctx.internalServerError("Failed to delete event location")
    }
  },
})
