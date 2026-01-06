/**
 * Custom controller for venue management
 * Allows organizers to manage venues
 */

import type { Core } from "@strapi/strapi"
import slugify from "slugify"
import { imageSize } from "image-size"
import * as fs from "fs"

// Logo dimensions: 1:1 square, 200x200 output
const LOGO_ASPECT_RATIO = 1
const LOGO_OUTPUT_SIZE = 200
// Tolerance for aspect ratio validation (allow 1:1 with 5% tolerance)
const ASPECT_RATIO_TOLERANCE = 0.05

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
 * Validate that an image has the correct aspect ratio for venue logos (1:1 square)
 * @param width - Image width
 * @param height - Image height
 * @returns true if aspect ratio is valid (1:1), false otherwise
 */
function isValidLogoRatio(width: number, height: number): boolean {
  const ratio = width / height
  return Math.abs(ratio - LOGO_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE
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
  const maxPathIdResult = await strapi.db
    .query("plugin::upload.folder")
    .findMany({
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
 * Get or create a nested folder path for venue logos
 * Creates: venues/{venueSlug}
 * @param strapi - Strapi instance
 * @param venueSlug - The venue short name (slug)
 * @returns The innermost folder ID
 */
async function getOrCreateVenueLogoFolder(
  strapi: Core.Strapi,
  venueSlug: string
): Promise<number> {
  // Create venues folder at root level
  const venuesFolderId = await getOrCreateFolder(strapi, "venues", null)

  // Create venue folder inside venues
  const venueFolderId = await getOrCreateFolder(strapi, venueSlug, venuesFolderId)

  return venueFolderId
}

interface VenueData {
  name?: string
  website?: string
  addressDetails?: string
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
    ctx.forbidden("Only organizers can manage venues")
    return false
  }

  return true
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * List all venues with pagination and search
   */
  async list(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { search, page = 1, pageSize = 25 } = ctx.query

    try {
      // Fetch all venues with events count
      const allVenues = await strapi.documents("api::venue.venue").findMany({
        populate: {
          events: {
            fields: ["id"],
          },
          logo: true,
        },
      })

      // Apply filters
      let filteredVenues = allVenues

      // Search filter (case-insensitive)
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchLower = search.trim().toLowerCase()
        filteredVenues = filteredVenues.filter(
          (venue) =>
            venue.name.toLowerCase().includes(searchLower) ||
            venue.addressDetails?.toLowerCase().includes(searchLower)
        )
      }

      // Sort by name
      filteredVenues.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))

      // Calculate pagination
      const total = filteredVenues.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const paginatedVenues = filteredVenues.slice(startIndex, startIndex + Number(pageSize))

      // Format response
      const formattedVenues = paginatedVenues.map((venue) => ({
        documentId: venue.documentId,
        name: venue.name,
        addressDetails: venue.addressDetails,
        website: venue.website,
        logo: venue.logo
          ? {
              url: venue.logo.url,
              formats: venue.logo.formats,
            }
          : null,
        eventsCount: venue.events?.length || 0,
      }))

      return ctx.send({
        data: formattedVenues,
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
      strapi.log.error(`[Venue] Failed to list venues: ${error}`)
      return ctx.internalServerError("Failed to list venues")
    }
  },

  /**
   * Get a single venue for editing
   */
  async findOne(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: venueId } = ctx.params

    if (!venueId) {
      return ctx.badRequest("Venue ID is required")
    }

    try {
      const venue = await strapi.documents("api::venue.venue").findOne({
        documentId: venueId,
        populate: {
          events: {
            fields: ["id", "name", "slug"],
          },
          logo: true,
          socialNetworks: true,
        },
      })

      if (!venue) {
        return ctx.notFound("Venue not found")
      }

      return ctx.send({
        data: {
          documentId: venue.documentId,
          name: venue.name,
          website: venue.website,
          addressDetails: venue.addressDetails,
          location: venue.location,
          logo: venue.logo
            ? {
                id: venue.logo.id,
                url: venue.logo.url,
                formats: venue.logo.formats,
              }
            : null,
          socialNetworks: venue.socialNetworks || [],
          eventsCount: venue.events?.length || 0,
          events: venue.events || [],
        },
      })
    } catch (error) {
      strapi.log.error(`[Venue] Failed to get venue: ${error}`)
      return ctx.internalServerError("Failed to get venue")
    }
  },

  /**
   * Create a new venue
   */
  async create(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const data: VenueData = ctx.request.body?.data || {}

    if (!data.name || data.name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    try {
      // Check for duplicate name
      const existing = await strapi.documents("api::venue.venue").findMany({
        filters: {
          name: { $eqi: data.name.trim() },
        },
      })

      if (existing.length > 0) {
        return ctx.badRequest("A venue with this name already exists")
      }

      // Create the venue
      const newVenue = await strapi.documents("api::venue.venue").create({
        data: {
          name: data.name.trim(),
          website: data.website?.trim() || null,
          addressDetails: data.addressDetails?.trim() || null,
          location: data.location || null,
        },
      })

      strapi.log.info(`[Venue] Created venue: ${newVenue.name} (${newVenue.documentId})`)

      return ctx.send({
        data: {
          documentId: newVenue.documentId,
          name: newVenue.name,
          website: newVenue.website,
          addressDetails: newVenue.addressDetails,
          location: newVenue.location,
          eventsCount: 0,
        },
      })
    } catch (error) {
      strapi.log.error(`[Venue] Failed to create venue: ${error}`)
      return ctx.internalServerError("Failed to create venue")
    }
  },

  /**
   * Update a venue
   */
  async update(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: venueId } = ctx.params
    const data: VenueData = ctx.request.body?.data || {}

    if (!venueId) {
      return ctx.badRequest("Venue ID is required")
    }

    try {
      // Find existing venue
      const existingVenue = await strapi.documents("api::venue.venue").findOne({
        documentId: venueId,
      })

      if (!existingVenue) {
        return ctx.notFound("Venue not found")
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {}

      if (data.name !== undefined && data.name.trim().length > 0) {
        // Check for duplicate name (excluding current venue)
        const duplicates = await strapi.documents("api::venue.venue").findMany({
          filters: {
            name: { $eqi: data.name.trim() },
            documentId: { $ne: venueId },
          },
        })

        if (duplicates.length > 0) {
          return ctx.badRequest("A venue with this name already exists")
        }

        updateData.name = data.name.trim()
      }

      if (data.website !== undefined) {
        updateData.website = data.website?.trim() || null
      }

      if (data.addressDetails !== undefined) {
        updateData.addressDetails = data.addressDetails?.trim() || null
      }

      if (data.location !== undefined) {
        updateData.location = data.location
      }

      // Update the venue
      const updatedVenue = await strapi.documents("api::venue.venue").update({
        documentId: venueId,
        data: updateData,
        populate: {
          events: {
            fields: ["id"],
          },
          logo: true,
        },
      })

      strapi.log.info(`[Venue] Updated venue: ${updatedVenue.name} (${venueId})`)

      return ctx.send({
        data: {
          documentId: updatedVenue.documentId,
          name: updatedVenue.name,
          website: updatedVenue.website,
          addressDetails: updatedVenue.addressDetails,
          location: updatedVenue.location,
          logo: updatedVenue.logo
            ? {
                url: updatedVenue.logo.url,
                formats: updatedVenue.logo.formats,
              }
            : null,
          eventsCount: updatedVenue.events?.length || 0,
        },
      })
    } catch (error) {
      strapi.log.error(`[Venue] Failed to update venue: ${error}`)
      return ctx.internalServerError("Failed to update venue")
    }
  },

  /**
   * Delete a venue (only if it has no events)
   */
  async delete(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: venueId } = ctx.params

    if (!venueId) {
      return ctx.badRequest("Venue ID is required")
    }

    try {
      // Find venue with events
      const venue = await strapi.documents("api::venue.venue").findOne({
        documentId: venueId,
        populate: {
          events: {
            fields: ["id", "name"],
          },
        },
      })

      if (!venue) {
        return ctx.notFound("Venue not found")
      }

      // Check if venue has events
      if (venue.events && venue.events.length > 0) {
        return ctx.badRequest(
          `Cannot delete this venue because it has ${venue.events.length} event(s) attached. Please reassign or delete those events first.`
        )
      }

      // Delete the venue
      await strapi.documents("api::venue.venue").delete({
        documentId: venueId,
      })

      strapi.log.info(`[Venue] Deleted venue: ${venue.name} (${venueId})`)

      return ctx.send({
        data: {
          documentId: venueId,
          deleted: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[Venue] Failed to delete venue: ${error}`)
      return ctx.internalServerError("Failed to delete venue")
    }
  },

  /**
   * Upload a logo for a venue (organizers only)
   */
  async uploadLogo(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: venueId } = ctx.params

    if (!venueId) {
      return ctx.badRequest("Venue ID is required")
    }

    // Fetch venue to verify it exists
    const venue = await strapi.documents("api::venue.venue").findOne({
      documentId: venueId,
      populate: {
        logo: true,
      },
    })

    if (!venue) {
      return ctx.notFound("Venue not found")
    }

    // Get file from request
    const { files } = ctx.request as any
    const uploadedFile = files?.files

    if (!uploadedFile) {
      return ctx.badRequest("No file uploaded")
    }

    // Validate image dimensions (must be 1:1 square)
    const filePath = uploadedFile.filepath || uploadedFile.path
    if (filePath) {
      const dimensions = getImageDimensions(filePath)
      if (dimensions) {
        if (!isValidLogoRatio(dimensions.width, dimensions.height)) {
          const currentRatio = (dimensions.width / dimensions.height).toFixed(2)
          return ctx.badRequest(
            `Logo must have a 1:1 aspect ratio (square). ` +
            `Your image is ${dimensions.width}x${dimensions.height} (ratio: ${currentRatio}).`
          )
        }
      }
    }

    try {
      // Get or create folder for venue logos: venues/{venueSlug}
      const venueSlug = slugify(venue.name, { lower: true, strict: true })
      const folderId = await getOrCreateVenueLogoFolder(strapi, venueSlug)

      // Upload file to Strapi media library
      const uploadService = strapi.plugins.upload.services.upload
      const [uploadedMedia] = await uploadService.upload({
        data: {
          fileInfo: {
            name: uploadedFile.name,
            caption: `${venue.name} logo`,
            folder: folderId,
          },
        },
        files: uploadedFile,
      })

      // Update venue with new logo
      await strapi.documents("api::venue.venue").update({
        documentId: venueId,
        data: {
          logo: uploadedMedia.id,
        } as any,
      })

      strapi.log.info(`[Venue] Logo uploaded for "${venue.name}" (${venueId})`)

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
      strapi.log.error(`[Venue] Logo upload failed: ${error}`)
      return ctx.badRequest("Failed to upload logo")
    }
  },

  /**
   * Set existing library image as venue logo (organizers only)
   */
  async setLogoFromLibrary(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: venueId } = ctx.params
    const requestData = ctx.request.body?.data

    if (!venueId) {
      return ctx.badRequest("Venue ID is required")
    }

    const { fileId } = requestData || {}
    if (!fileId || typeof fileId !== "number") {
      return ctx.badRequest("fileId is required")
    }

    // Fetch venue to verify it exists
    const venue = await strapi.documents("api::venue.venue").findOne({
      documentId: venueId,
    })

    if (!venue) {
      return ctx.notFound("Venue not found")
    }

    // Verify file exists
    const file = await strapi.plugins.upload.services.upload.findOne(fileId)
    if (!file) {
      return ctx.badRequest("File not found in media library")
    }

    try {
      // Update venue with selected logo
      await strapi.documents("api::venue.venue").update({
        documentId: venueId,
        data: {
          logo: fileId,
        } as any,
      })

      strapi.log.info(`[Venue] Logo set from library for "${venue.name}" (${venueId}): file ${fileId}`)

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
      strapi.log.error(`[Venue] Set logo from library failed: ${error}`)
      return ctx.badRequest("Failed to set logo")
    }
  },

  /**
   * Remove logo from venue (organizers only)
   */
  async removeLogo(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: venueId } = ctx.params

    if (!venueId) {
      return ctx.badRequest("Venue ID is required")
    }

    // Fetch venue to verify it exists
    const venue = await strapi.documents("api::venue.venue").findOne({
      documentId: venueId,
      populate: {
        logo: true,
      },
    })

    if (!venue) {
      return ctx.notFound("Venue not found")
    }

    try {
      // Clear logo (set to null)
      await strapi.documents("api::venue.venue").update({
        documentId: venueId,
        data: {
          logo: null,
        } as any,
      })

      strapi.log.info(`[Venue] Logo removed from "${venue.name}" (${venueId})`)

      return ctx.send({
        data: { success: true },
      })
    } catch (error) {
      strapi.log.error(`[Venue] Remove logo failed: ${error}`)
      return ctx.badRequest("Failed to remove logo")
    }
  },
})
