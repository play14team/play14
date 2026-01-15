/**
 * Custom controller for sponsor management
 * Allows organizers to manage sponsors
 */

import type { Core } from "@strapi/strapi"
import slugify from "slugify"
import { imageSize } from "image-size"
import * as fs from "fs"

// Logo dimensions: 1:1 square, 200x200 output
const LOGO_ASPECT_RATIO = 1
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
 * Validate that an image has the correct aspect ratio for sponsor logos (1:1 square)
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
 * Get or create a nested folder path for sponsor logos
 * Creates: sponsors/{sponsorSlug}
 * @param strapi - Strapi instance
 * @param sponsorSlug - The sponsor short name (slug)
 * @returns The innermost folder ID
 */
async function getOrCreateSponsorLogoFolder(
  strapi: Core.Strapi,
  sponsorSlug: string
): Promise<number> {
  // Create sponsors folder at root level
  const sponsorsFolderId = await getOrCreateFolder(strapi, "sponsors", null)

  // Create sponsor folder inside sponsors
  const sponsorFolderId = await getOrCreateFolder(strapi, sponsorSlug, sponsorsFolderId)

  return sponsorFolderId
}

interface SponsorData {
  name?: string
  url?: string
  socialNetworks?: Array<{
    id?: number
    url: string
    type: string
  }>
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
    ctx.forbidden("Only organizers can manage sponsors")
    return false
  }

  return true
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * List all sponsors with pagination and search
   */
  async list(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { search, page = 1, pageSize = 25 } = ctx.query

    try {
      // Fetch all sponsors with logo
      const allSponsors = await strapi.documents("api::sponsor.sponsor").findMany({
        populate: {
          logo: true,
        },
      })

      // Apply filters
      let filteredSponsors = allSponsors

      // Search filter (case-insensitive)
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchLower = search.trim().toLowerCase()
        filteredSponsors = filteredSponsors.filter(
          (sponsor) =>
            sponsor.name.toLowerCase().includes(searchLower) ||
            sponsor.url?.toLowerCase().includes(searchLower)
        )
      }

      // Sort by name
      filteredSponsors.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))

      // Calculate pagination
      const total = filteredSponsors.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const paginatedSponsors = filteredSponsors.slice(startIndex, startIndex + Number(pageSize))

      // Get events count for each sponsor (through sponsorships)
      const sponsorEventsCount: Record<string, number> = {}
      const allEvents = await strapi.documents("api::event.event").findMany({
        populate: {
          sponsorships: {
            populate: {
              sponsors: {
                fields: ["documentId"],
              },
            },
          },
        },
      })

      for (const event of allEvents) {
        if (event.sponsorships) {
          for (const sponsorship of event.sponsorships) {
            if (sponsorship.sponsors) {
              for (const sponsor of sponsorship.sponsors) {
                sponsorEventsCount[sponsor.documentId] =
                  (sponsorEventsCount[sponsor.documentId] || 0) + 1
              }
            }
          }
        }
      }

      // Format response
      const formattedSponsors = paginatedSponsors.map((sponsor) => ({
        documentId: sponsor.documentId,
        name: sponsor.name,
        url: sponsor.url,
        logo: sponsor.logo
          ? {
              url: sponsor.logo.url,
              formats: sponsor.logo.formats,
            }
          : null,
        eventsCount: sponsorEventsCount[sponsor.documentId] || 0,
      }))

      return ctx.send({
        data: formattedSponsors,
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
      strapi.log.error(`[Sponsor] Failed to list sponsors: ${error}`)
      return ctx.internalServerError("Failed to list sponsors")
    }
  },

  /**
   * Get a single sponsor for editing
   */
  async findOne(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: sponsorId } = ctx.params

    if (!sponsorId) {
      return ctx.badRequest("Sponsor ID is required")
    }

    try {
      const sponsor = await strapi.documents("api::sponsor.sponsor").findOne({
        documentId: sponsorId,
        populate: {
          logo: true,
          socialNetworks: true,
        },
      })

      if (!sponsor) {
        return ctx.notFound("Sponsor not found")
      }

      // Get events using this sponsor (through sponsorships)
      const allEvents = await strapi.documents("api::event.event").findMany({
        populate: {
          sponsorships: {
            populate: {
              sponsors: {
                fields: ["documentId"],
              },
            },
          },
        },
      })

      const eventsUsingSponsor: Array<{ id: number; name: string; slug: string }> = []
      for (const event of allEvents) {
        if (event.sponsorships) {
          for (const sponsorship of event.sponsorships) {
            if (sponsorship.sponsors?.some((s: any) => s.documentId === sponsorId)) {
              eventsUsingSponsor.push({
                id: event.id,
                name: event.name,
                slug: event.slug,
              })
              break // Only add event once even if sponsor appears in multiple categories
            }
          }
        }
      }

      return ctx.send({
        data: {
          documentId: sponsor.documentId,
          name: sponsor.name,
          url: sponsor.url,
          logo: sponsor.logo
            ? {
                id: sponsor.logo.id,
                url: sponsor.logo.url,
                formats: sponsor.logo.formats,
              }
            : null,
          socialNetworks: sponsor.socialNetworks || [],
          eventsCount: eventsUsingSponsor.length,
          events: eventsUsingSponsor,
        },
      })
    } catch (error) {
      strapi.log.error(`[Sponsor] Failed to get sponsor: ${error}`)
      return ctx.internalServerError("Failed to get sponsor")
    }
  },

  /**
   * Create a new sponsor
   */
  async create(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const data: SponsorData = ctx.request.body?.data || {}

    if (!data.name || data.name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    try {
      // Check for duplicate name
      const existing = await strapi.documents("api::sponsor.sponsor").findMany({
        filters: {
          name: { $eqi: data.name.trim() },
        },
      })

      if (existing.length > 0) {
        return ctx.badRequest("A sponsor with this name already exists")
      }

      // Create the sponsor
      const newSponsor = await strapi.documents("api::sponsor.sponsor").create({
        data: {
          name: data.name.trim(),
          url: data.url?.trim() || null,
          socialNetworks: data.socialNetworks || [],
        },
      })

      strapi.log.info(`[Sponsor] Created sponsor: ${newSponsor.name} (${newSponsor.documentId})`)

      return ctx.send({
        data: {
          documentId: newSponsor.documentId,
          name: newSponsor.name,
          url: newSponsor.url,
          eventsCount: 0,
        },
      })
    } catch (error) {
      strapi.log.error(`[Sponsor] Failed to create sponsor: ${error}`)
      return ctx.internalServerError("Failed to create sponsor")
    }
  },

  /**
   * Update a sponsor
   */
  async update(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: sponsorId } = ctx.params
    const data: SponsorData = ctx.request.body?.data || {}

    if (!sponsorId) {
      return ctx.badRequest("Sponsor ID is required")
    }

    try {
      // Find existing sponsor
      const existingSponsor = await strapi.documents("api::sponsor.sponsor").findOne({
        documentId: sponsorId,
      })

      if (!existingSponsor) {
        return ctx.notFound("Sponsor not found")
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {}

      if (data.name !== undefined && data.name.trim().length > 0) {
        // Check for duplicate name (excluding current sponsor)
        const duplicates = await strapi.documents("api::sponsor.sponsor").findMany({
          filters: {
            name: { $eqi: data.name.trim() },
            documentId: { $ne: sponsorId },
          },
        })

        if (duplicates.length > 0) {
          return ctx.badRequest("A sponsor with this name already exists")
        }

        updateData.name = data.name.trim()
      }

      if (data.url !== undefined) {
        updateData.url = data.url?.trim() || null
      }

      if (data.socialNetworks !== undefined) {
        updateData.socialNetworks = data.socialNetworks
      }

      // Update the sponsor
      const updatedSponsor = await strapi.documents("api::sponsor.sponsor").update({
        documentId: sponsorId,
        data: updateData,
        populate: {
          logo: true,
          socialNetworks: true,
        },
      })

      strapi.log.info(`[Sponsor] Updated sponsor: ${updatedSponsor.name} (${sponsorId})`)

      return ctx.send({
        data: {
          documentId: updatedSponsor.documentId,
          name: updatedSponsor.name,
          url: updatedSponsor.url,
          logo: updatedSponsor.logo
            ? {
                url: updatedSponsor.logo.url,
                formats: updatedSponsor.logo.formats,
              }
            : null,
          socialNetworks: updatedSponsor.socialNetworks || [],
        },
      })
    } catch (error) {
      strapi.log.error(`[Sponsor] Failed to update sponsor: ${error}`)
      return ctx.internalServerError("Failed to update sponsor")
    }
  },

  /**
   * Delete a sponsor (only if it has no events)
   */
  async delete(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: sponsorId } = ctx.params

    if (!sponsorId) {
      return ctx.badRequest("Sponsor ID is required")
    }

    try {
      // Find sponsor
      const sponsor = await strapi.documents("api::sponsor.sponsor").findOne({
        documentId: sponsorId,
      })

      if (!sponsor) {
        return ctx.notFound("Sponsor not found")
      }

      // Check if sponsor is used by any events (through sponsorships)
      const allEvents = await strapi.documents("api::event.event").findMany({
        populate: {
          sponsorships: {
            populate: {
              sponsors: {
                fields: ["documentId"],
              },
            },
          },
        },
      })

      const eventsUsingSponsor: string[] = []
      for (const event of allEvents) {
        if (event.sponsorships) {
          for (const sponsorship of event.sponsorships) {
            if (sponsorship.sponsors?.some((s: any) => s.documentId === sponsorId)) {
              eventsUsingSponsor.push(event.name)
              break
            }
          }
        }
      }

      if (eventsUsingSponsor.length > 0) {
        return ctx.badRequest(
          `Cannot delete this sponsor because it is used by ${eventsUsingSponsor.length} event(s). Please remove it from those events first.`
        )
      }

      // Delete the sponsor
      await strapi.documents("api::sponsor.sponsor").delete({
        documentId: sponsorId,
      })

      strapi.log.info(`[Sponsor] Deleted sponsor: ${sponsor.name} (${sponsorId})`)

      return ctx.send({
        data: {
          documentId: sponsorId,
          deleted: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[Sponsor] Failed to delete sponsor: ${error}`)
      return ctx.internalServerError("Failed to delete sponsor")
    }
  },

  /**
   * Upload a logo for a sponsor (organizers only)
   */
  async uploadLogo(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: sponsorId } = ctx.params

    if (!sponsorId) {
      return ctx.badRequest("Sponsor ID is required")
    }

    // Fetch sponsor to verify it exists
    const sponsor = await strapi.documents("api::sponsor.sponsor").findOne({
      documentId: sponsorId,
      populate: {
        logo: true,
      },
    })

    if (!sponsor) {
      return ctx.notFound("Sponsor not found")
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
      // Get or create folder for sponsor logos: sponsors/{sponsorSlug}
      const sponsorSlug = slugify(sponsor.name, { lower: true, strict: true })
      const folderId = await getOrCreateSponsorLogoFolder(strapi, sponsorSlug)

      // Upload file to Strapi media library
      const uploadService = strapi.plugins.upload.services.upload
      const [uploadedMedia] = await uploadService.upload({
        data: {
          fileInfo: {
            name: uploadedFile.name,
            caption: `${sponsor.name} logo`,
            folder: folderId,
          },
        },
        files: uploadedFile,
      })

      // Update sponsor with new logo
      await strapi.documents("api::sponsor.sponsor").update({
        documentId: sponsorId,
        data: {
          logo: uploadedMedia.id,
        } as any,
      })

      strapi.log.info(`[Sponsor] Logo uploaded for "${sponsor.name}" (${sponsorId})`)

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
      strapi.log.error(`[Sponsor] Logo upload failed: ${error}`)
      return ctx.badRequest("Failed to upload logo")
    }
  },

  /**
   * Set existing library image as sponsor logo (organizers only)
   */
  async setLogoFromLibrary(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: sponsorId } = ctx.params
    const requestData = ctx.request.body?.data

    if (!sponsorId) {
      return ctx.badRequest("Sponsor ID is required")
    }

    const { fileId } = requestData || {}
    if (!fileId || typeof fileId !== "number") {
      return ctx.badRequest("fileId is required")
    }

    // Fetch sponsor to verify it exists
    const sponsor = await strapi.documents("api::sponsor.sponsor").findOne({
      documentId: sponsorId,
    })

    if (!sponsor) {
      return ctx.notFound("Sponsor not found")
    }

    // Verify file exists
    const file = await strapi.plugins.upload.services.upload.findOne(fileId)
    if (!file) {
      return ctx.badRequest("File not found in media library")
    }

    try {
      // Update sponsor with selected logo
      await strapi.documents("api::sponsor.sponsor").update({
        documentId: sponsorId,
        data: {
          logo: fileId,
        } as any,
      })

      strapi.log.info(`[Sponsor] Logo set from library for "${sponsor.name}" (${sponsorId}): file ${fileId}`)

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
      strapi.log.error(`[Sponsor] Set logo from library failed: ${error}`)
      return ctx.badRequest("Failed to set logo")
    }
  },

  /**
   * Remove logo from sponsor (organizers only)
   */
  async removeLogo(ctx) {
    if (!(await requireOrganizer(strapi, ctx))) return

    const { id: sponsorId } = ctx.params

    if (!sponsorId) {
      return ctx.badRequest("Sponsor ID is required")
    }

    // Fetch sponsor to verify it exists
    const sponsor = await strapi.documents("api::sponsor.sponsor").findOne({
      documentId: sponsorId,
      populate: {
        logo: true,
      },
    })

    if (!sponsor) {
      return ctx.notFound("Sponsor not found")
    }

    try {
      // Clear logo (set to null)
      await strapi.documents("api::sponsor.sponsor").update({
        documentId: sponsorId,
        data: {
          logo: null,
        } as any,
      })

      strapi.log.info(`[Sponsor] Logo removed from "${sponsor.name}" (${sponsorId})`)

      return ctx.send({
        data: { success: true },
      })
    } catch (error) {
      strapi.log.error(`[Sponsor] Remove logo failed: ${error}`)
      return ctx.badRequest("Failed to remove logo")
    }
  },
})
