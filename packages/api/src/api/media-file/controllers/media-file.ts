/**
 * Media file controller
 * Provides access to upload plugin files via REST API with folder filtering
 */

import type { Core } from "@strapi/strapi"

interface MediaFileController {
  find: (ctx: any) => Promise<void>
}

const controller = ({ strapi }: { strapi: Core.Strapi }): MediaFileController => ({
  /**
   * List files with folder, mime, and name filtering
   * GET /api/media-files?filters[folder][$null]=true      (root level files)
   * GET /api/media-files?filters[folder]=5                (files in folder 5)
   * GET /api/media-files?filters[mime][$containsi]=image  (images only)
   * GET /api/media-files?filters[name][$containsi]=photo  (search by name)
   */
  async find(ctx) {
    const { query } = ctx

    // Build the query for files
    const filters: Record<string, any> = {}

    // Handle folder filtering
    if (query.filters?.folder !== undefined) {
      if (query.filters.folder.$null === "true") {
        filters.folder = null
      } else {
        filters.folder = parseInt(query.filters.folder, 10)
      }
    }

    // Handle mime type filtering
    if (query.filters?.mime?.$containsi) {
      filters.mime = {
        $containsi: query.filters.mime.$containsi,
      }
    }

    // Handle name search
    if (query.filters?.name?.$containsi) {
      filters.name = {
        $containsi: query.filters.name.$containsi,
      }
    }

    // Pagination
    const start = parseInt(query.start || "0", 10)
    const limit = parseInt(query.limit || "24", 10)

    // Sorting
    const sort = query.sort || "createdAt:desc"
    const [sortField, sortOrder] = sort.split(":")

    try {
      // Find files using the database query
      const files = await strapi.db.query("plugin::upload.file").findMany({
        where: filters,
        orderBy: { [sortField]: sortOrder?.toLowerCase() || "desc" },
        offset: start,
        limit,
      })

      // Return files array directly (matching Strapi upload API format)
      ctx.body = files.map((file: any) => ({
        id: file.id,
        documentId: file.documentId,
        name: file.name,
        alternativeText: file.alternativeText,
        caption: file.caption,
        width: file.width,
        height: file.height,
        formats: file.formats,
        hash: file.hash,
        ext: file.ext,
        mime: file.mime,
        size: file.size,
        url: file.url,
        previewUrl: file.previewUrl,
        provider: file.provider,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        folderPath: file.folderPath,
        folder: file.folder,
      }))
    } catch (error) {
      strapi.log.error("Error fetching media files:", error)
      ctx.throw(500, "Failed to fetch media files")
    }
  },
})

export default controller
