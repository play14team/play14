/**
 * Custom controller for liked-item management
 * Allows founders to manage "things we like" showcase items
 */

import * as fs from "node:fs"
import type { Core } from "@strapi/strapi"
import { imageSize } from "image-size"
import slugify from "slugify"

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
  const existingFolder = await strapi.db.query("plugin::upload.folder").findOne({
    where: {
      name: folderName,
      parent: parentId,
    },
  })

  if (existingFolder) {
    return existingFolder.id
  }

  const maxPathIdResult = await strapi.db.query("plugin::upload.folder").findMany({
    orderBy: { pathId: "desc" },
    limit: 1,
  })

  const nextPathId = maxPathIdResult.length > 0 ? maxPathIdResult[0].pathId + 1 : 1

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
 * Get or create a nested folder path for liked item images
 * Creates: liked-items/{itemSlug}
 * @param strapi - Strapi instance
 * @param itemSlug - The item short name (slug)
 * @returns The innermost folder ID
 */
async function getOrCreateLikedItemImageFolder(
  strapi: Core.Strapi,
  itemSlug: string
): Promise<number> {
  const likedItemsFolderId = await getOrCreateFolder(strapi, "liked-items", null)
  const itemFolderId = await getOrCreateFolder(strapi, itemSlug, likedItemsFolderId)
  return itemFolderId
}

interface LikedItemData {
  name?: string
  description?: string
  url?: string
  contributorIds?: string[]
}

/**
 * Check if user is a founder
 */
async function requireFounder(strapi: Core.Strapi, ctx: any): Promise<boolean> {
  const user = ctx.state.user

  if (!user) {
    ctx.unauthorized("You must be logged in")
    return false
  }

  const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
    filters: { id: user.id },
    populate: { player: true },
  })

  if (!userWithPlayer?.player) {
    ctx.forbidden("You must have a linked player profile")
    return false
  }

  const position = userWithPlayer.player.position

  if (position !== "Founder") {
    ctx.forbidden("Only founders can manage liked items")
    return false
  }

  return true
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * List all liked items with pagination and search
   */
  async list(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { search, page = 1, pageSize = 25 } = ctx.query

    try {
      const allItems = await strapi.documents("api::liked-item.liked-item").findMany({
        populate: {
          image: true,
          contributors: {
            populate: {
              avatar: true,
            },
          },
        },
      })

      let filteredItems = allItems

      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchLower = search.trim().toLowerCase()
        filteredItems = filteredItems.filter(
          (item) =>
            item.name.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.url?.toLowerCase().includes(searchLower)
        )
      }

      filteredItems.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))

      const total = filteredItems.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const paginatedItems = filteredItems.slice(startIndex, startIndex + Number(pageSize))

      const formattedItems = paginatedItems.map((item) => ({
        documentId: item.documentId,
        name: item.name,
        description: item.description,
        url: item.url,
        image: item.image
          ? {
              url: item.image.url,
              formats: item.image.formats,
            }
          : null,
        contributors: item.contributors?.map((c: any) => ({
          documentId: c.documentId,
          name: c.name,
          slug: c.slug,
          avatar: c.avatar
            ? {
                url: c.avatar.url,
                formats: c.avatar.formats,
              }
            : null,
        })) || [],
        contributorsCount: item.contributors?.length || 0,
      }))

      return ctx.send({
        data: formattedItems,
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
      strapi.log.error(`[LikedItem] Failed to list liked items: ${error}`)
      return ctx.internalServerError("Failed to list liked items")
    }
  },

  /**
   * Get a single liked item for editing
   */
  async findOne(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: itemId } = ctx.params

    if (!itemId) {
      return ctx.badRequest("Liked item ID is required")
    }

    try {
      const item = await strapi.documents("api::liked-item.liked-item").findOne({
        documentId: itemId,
        populate: {
          image: true,
          contributors: {
            populate: {
              avatar: true,
            },
          },
        },
      })

      if (!item) {
        return ctx.notFound("Liked item not found")
      }

      return ctx.send({
        data: {
          documentId: item.documentId,
          name: item.name,
          description: item.description,
          url: item.url,
          image: item.image
            ? {
                id: item.image.id,
                url: item.image.url,
                formats: item.image.formats,
              }
            : null,
          contributors: item.contributors?.map((c: any) => ({
            documentId: c.documentId,
            name: c.name,
            slug: c.slug,
            avatar: c.avatar
              ? {
                  url: c.avatar.url,
                  formats: c.avatar.formats,
                }
              : null,
          })) || [],
        },
      })
    } catch (error) {
      strapi.log.error(`[LikedItem] Failed to get liked item: ${error}`)
      return ctx.internalServerError("Failed to get liked item")
    }
  },

  /**
   * Create a new liked item
   */
  async create(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const data: LikedItemData = ctx.request.body?.data || {}

    if (!data.name || data.name.trim().length === 0) {
      return ctx.badRequest("Name is required")
    }

    if (!data.url || data.url.trim().length === 0) {
      return ctx.badRequest("URL is required")
    }

    try {
      const existing = await strapi.documents("api::liked-item.liked-item").findMany({
        filters: {
          name: { $eqi: data.name.trim() },
        },
      })

      if (existing.length > 0) {
        return ctx.badRequest("A liked item with this name already exists")
      }

      const newItem = await strapi.documents("api::liked-item.liked-item").create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          url: data.url.trim(),
          contributors: data.contributorIds || [],
        },
      })

      strapi.log.info(`[LikedItem] Created liked item: ${newItem.name} (${newItem.documentId})`)

      return ctx.send({
        data: {
          documentId: newItem.documentId,
          name: newItem.name,
          description: newItem.description,
          url: newItem.url,
        },
      })
    } catch (error) {
      strapi.log.error(`[LikedItem] Failed to create liked item: ${error}`)
      return ctx.internalServerError("Failed to create liked item")
    }
  },

  /**
   * Update a liked item
   */
  async update(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: itemId } = ctx.params
    const data: LikedItemData = ctx.request.body?.data || {}

    if (!itemId) {
      return ctx.badRequest("Liked item ID is required")
    }

    try {
      const existingItem = await strapi.documents("api::liked-item.liked-item").findOne({
        documentId: itemId,
      })

      if (!existingItem) {
        return ctx.notFound("Liked item not found")
      }

      const updateData: Record<string, unknown> = {}

      if (data.name !== undefined && data.name.trim().length > 0) {
        const duplicates = await strapi.documents("api::liked-item.liked-item").findMany({
          filters: {
            name: { $eqi: data.name.trim() },
            documentId: { $ne: itemId },
          },
        })

        if (duplicates.length > 0) {
          return ctx.badRequest("A liked item with this name already exists")
        }

        updateData.name = data.name.trim()
      }

      if (data.description !== undefined) {
        updateData.description = data.description?.trim() || null
      }

      if (data.url !== undefined) {
        updateData.url = data.url?.trim() || null
      }

      if (data.contributorIds !== undefined) {
        updateData.contributors = data.contributorIds
      }

      const updatedItem = await strapi.documents("api::liked-item.liked-item").update({
        documentId: itemId,
        data: updateData,
        populate: {
          image: true,
          contributors: {
            populate: {
              avatar: true,
            },
          },
        },
      })

      strapi.log.info(`[LikedItem] Updated liked item: ${updatedItem.name} (${itemId})`)

      return ctx.send({
        data: {
          documentId: updatedItem.documentId,
          name: updatedItem.name,
          description: updatedItem.description,
          url: updatedItem.url,
          image: updatedItem.image
            ? {
                url: updatedItem.image.url,
                formats: updatedItem.image.formats,
              }
            : null,
          contributors: updatedItem.contributors?.map((c: any) => ({
            documentId: c.documentId,
            name: c.name,
            slug: c.slug,
          })) || [],
        },
      })
    } catch (error) {
      strapi.log.error(`[LikedItem] Failed to update liked item: ${error}`)
      return ctx.internalServerError("Failed to update liked item")
    }
  },

  /**
   * Delete a liked item
   */
  async delete(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: itemId } = ctx.params

    if (!itemId) {
      return ctx.badRequest("Liked item ID is required")
    }

    try {
      const item = await strapi.documents("api::liked-item.liked-item").findOne({
        documentId: itemId,
      })

      if (!item) {
        return ctx.notFound("Liked item not found")
      }

      await strapi.documents("api::liked-item.liked-item").delete({
        documentId: itemId,
      })

      strapi.log.info(`[LikedItem] Deleted liked item: ${item.name} (${itemId})`)

      return ctx.send({
        data: {
          documentId: itemId,
          deleted: true,
        },
      })
    } catch (error) {
      strapi.log.error(`[LikedItem] Failed to delete liked item: ${error}`)
      return ctx.internalServerError("Failed to delete liked item")
    }
  },

  /**
   * Upload an image for a liked item (founders only)
   */
  async uploadImage(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: itemId } = ctx.params

    if (!itemId) {
      return ctx.badRequest("Liked item ID is required")
    }

    const item = await strapi.documents("api::liked-item.liked-item").findOne({
      documentId: itemId,
      populate: {
        image: true,
      },
    })

    if (!item) {
      return ctx.notFound("Liked item not found")
    }

    const { files } = ctx.request as any
    const uploadedFile = files?.files

    if (!uploadedFile) {
      return ctx.badRequest("No file uploaded")
    }

    try {
      const itemSlug = slugify(item.name, { lower: true, strict: true })
      const folderId = await getOrCreateLikedItemImageFolder(strapi, itemSlug)

      const uploadService = strapi.plugins.upload.services.upload
      const [uploadedMedia] = await uploadService.upload({
        data: {
          fileInfo: {
            name: uploadedFile.name,
            caption: `${item.name} image`,
            folder: folderId,
          },
        },
        files: uploadedFile,
      })

      await strapi.documents("api::liked-item.liked-item").update({
        documentId: itemId,
        data: {
          image: uploadedMedia.id,
        } as any,
      })

      strapi.log.info(`[LikedItem] Image uploaded for "${item.name}" (${itemId})`)

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
      strapi.log.error(`[LikedItem] Image upload failed: ${error}`)
      return ctx.badRequest("Failed to upload image")
    }
  },

  /**
   * Set existing library image as liked item image (founders only)
   */
  async setImageFromLibrary(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: itemId } = ctx.params
    const requestData = ctx.request.body?.data

    if (!itemId) {
      return ctx.badRequest("Liked item ID is required")
    }

    const { fileId } = requestData || {}
    if (!fileId || typeof fileId !== "number") {
      return ctx.badRequest("fileId is required")
    }

    const item = await strapi.documents("api::liked-item.liked-item").findOne({
      documentId: itemId,
    })

    if (!item) {
      return ctx.notFound("Liked item not found")
    }

    const file = await strapi.plugins.upload.services.upload.findOne(fileId)
    if (!file) {
      return ctx.badRequest("File not found in media library")
    }

    try {
      await strapi.documents("api::liked-item.liked-item").update({
        documentId: itemId,
        data: {
          image: fileId,
        } as any,
      })

      strapi.log.info(
        `[LikedItem] Image set from library for "${item.name}" (${itemId}): file ${fileId}`
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
      strapi.log.error(`[LikedItem] Set image from library failed: ${error}`)
      return ctx.badRequest("Failed to set image")
    }
  },

  /**
   * Remove image from liked item (founders only)
   */
  async removeImage(ctx) {
    if (!(await requireFounder(strapi, ctx))) return

    const { id: itemId } = ctx.params

    if (!itemId) {
      return ctx.badRequest("Liked item ID is required")
    }

    const item = await strapi.documents("api::liked-item.liked-item").findOne({
      documentId: itemId,
      populate: {
        image: true,
      },
    })

    if (!item) {
      return ctx.notFound("Liked item not found")
    }

    try {
      await strapi.documents("api::liked-item.liked-item").update({
        documentId: itemId,
        data: {
          image: null,
        } as any,
      })

      strapi.log.info(`[LikedItem] Image removed from "${item.name}" (${itemId})`)

      return ctx.send({
        data: { success: true },
      })
    } catch (error) {
      strapi.log.error(`[LikedItem] Remove image failed: ${error}`)
      return ctx.badRequest("Failed to remove image")
    }
  },

  /**
   * Get all liked items for public display (no auth required)
   */
  async listPublic(ctx) {
    try {
      const allItems = await strapi.documents("api::liked-item.liked-item").findMany({
        populate: {
          image: true,
          contributors: {
            populate: {
              avatar: true,
            },
          },
        },
      })

      allItems.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))

      const formattedItems = allItems.map((item) => ({
        documentId: item.documentId,
        name: item.name,
        description: item.description,
        url: item.url,
        image: item.image
          ? {
              url: item.image.url,
              formats: item.image.formats,
            }
          : null,
        contributors: item.contributors?.map((c: any) => ({
          documentId: c.documentId,
          name: c.name,
          slug: c.slug,
          avatar: c.avatar
            ? {
                url: c.avatar.url,
                formats: c.avatar.formats,
              }
            : null,
        })) || [],
      }))

      return ctx.send({
        data: formattedItems,
      })
    } catch (error) {
      strapi.log.error(`[LikedItem] Failed to list public liked items: ${error}`)
      return ctx.internalServerError("Failed to list liked items")
    }
  },
})
