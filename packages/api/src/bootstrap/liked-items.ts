import * as fs from "node:fs"
import * as path from "node:path"
import type { Core } from "@strapi/strapi"

interface LikedItemImageMapping {
  name: string
  filename: string
}

const LIKED_ITEM_IMAGES: LikedItemImageMapping[] = [
  { name: "ISAGA", filename: "isaga.png" },
  { name: "Debriefing cube", filename: "debriefing-cube.png" },
  { name: "Playify", filename: "playify.png" },
  { name: "Team Catalyst", filename: "team-catalyst.png" },
  { name: "Story Cubes", filename: "story-cubes.jpg" },
  { name: "Happy Salmon", filename: "happy-salmon.jpg" },
]

/**
 * Bootstrap images for liked items.
 * This runs after the database migration has created the liked items.
 * It uploads images from the data folder and links them to the items.
 */
export async function bootstrapLikedItemImages(strapi: Core.Strapi): Promise<void> {
  strapi.log.info("[Bootstrap] Checking liked items for missing images...")

  // Use process.cwd() to get the Strapi project root, not the compiled dist directory
  const imagesDir = path.join(process.cwd(), "database/migrations/data/liked-items")

  // Check if the images directory exists
  if (!fs.existsSync(imagesDir)) {
    strapi.log.info("[Bootstrap] Liked items images directory not found, skipping image upload")
    return
  }

  // Get the upload service
  const uploadService = strapi.plugin("upload").service("upload")

  // Get or create the "liked-items" media folder
  const folderId = await getOrCreateMediaFolder(strapi, "liked-items")

  for (const mapping of LIKED_ITEM_IMAGES) {
    try {
      // Find the liked item by name
      const likedItem = await strapi.documents("api::liked-item.liked-item").findFirst({
        filters: { name: mapping.name },
        populate: { image: true },
      })

      if (!likedItem) {
        strapi.log.debug(`[Bootstrap] Liked item "${mapping.name}" not found, skipping`)
        continue
      }

      // Check if item already has an image
      if (likedItem.image) {
        strapi.log.debug(`[Bootstrap] Liked item "${mapping.name}" already has an image, skipping`)
        continue
      }

      // Check if the image file exists
      const imagePath = path.join(imagesDir, mapping.filename)
      if (!fs.existsSync(imagePath)) {
        strapi.log.warn(
          `[Bootstrap] Image file not found for "${mapping.name}": ${mapping.filename}`
        )
        continue
      }

      // Get file info
      const fileStats = fs.statSync(imagePath)
      const ext = path.extname(mapping.filename).toLowerCase()
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      }
      const mime = mimeTypes[ext] || "application/octet-stream"

      // Create a file object that matches what Strapi's upload service expects
      // See: @strapi/upload/dist/server/services/upload.js enhanceAndValidateFile()
      const fileData = {
        originalFilename: mapping.filename,
        mimetype: mime,
        size: fileStats.size,
        filepath: imagePath,
      }

      // Get the internal ID of the liked item for auto-linking
      const likedItemInternal = await strapi.db.query("api::liked-item.liked-item").findOne({
        where: { document_id: likedItem.documentId },
      })

      if (!likedItemInternal) {
        strapi.log.error(`[Bootstrap] Could not find internal ID for "${mapping.name}"`)
        continue
      }

      // Upload the file and auto-link to the liked item
      await uploadService.upload({
        data: {
          refId: likedItemInternal.id,
          ref: "api::liked-item.liked-item",
          field: "image",
          fileInfo: {
            name: mapping.filename,
            caption: mapping.name,
            alternativeText: mapping.name,
            folder: folderId,
          },
        },
        files: fileData,
      })

      strapi.log.info(`[Bootstrap] Uploaded and linked image for "${mapping.name}"`)
    } catch (error) {
      strapi.log.error(`[Bootstrap] Error processing image for "${mapping.name}": ${error}`)
    }
  }

  strapi.log.info("[Bootstrap] Liked items image bootstrap complete")
}

/**
 * Get or create a media folder by name at root level.
 */
async function getOrCreateMediaFolder(strapi: Core.Strapi, folderName: string): Promise<number> {
  // Check if folder exists at root level
  const existing = await strapi.db.query("plugin::upload.folder").findOne({
    where: { name: folderName, parent: null },
  })

  if (existing) {
    return existing.id
  }

  // Get next pathId
  const maxResult = await strapi.db.query("plugin::upload.folder").findMany({
    orderBy: { pathId: "desc" },
    limit: 1,
  })
  const nextPathId = maxResult.length > 0 ? maxResult[0].pathId + 1 : 1

  // Create folder
  const folder = await strapi.db.query("plugin::upload.folder").create({
    data: {
      name: folderName,
      pathId: nextPathId,
      path: `/${nextPathId}`,
      parent: null,
    },
  })

  strapi.log.info(`[Bootstrap] Created media folder "${folderName}" with id ${folder.id}`)
  return folder.id
}
