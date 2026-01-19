/**
 * Media folder controller
 * Provides access to upload plugin folders via REST API
 */

import type { Core } from "@strapi/strapi"

interface MediaFolderController {
  find: (ctx: any) => Promise<void>
}

const controller = ({ strapi }: { strapi: Core.Strapi }): MediaFolderController => ({
  /**
   * List folders with optional parent filtering
   * GET /api/media-folders?filters[parent][$null]=true  (root folders)
   * GET /api/media-folders?filters[parent]=5            (children of folder 5)
   */
  async find(ctx) {
    const { query } = ctx

    // Build the query for folders
    const filters: Record<string, any> = {}

    // Handle parent folder filtering
    if (query.filters?.parent) {
      if (query.filters.parent.$null === "true") {
        filters.parent = null
      } else {
        filters.parent = Number.parseInt(query.filters.parent, 10)
      }
    }

    try {
      // Find folders using the database query
      const folders = await strapi.db.query("plugin::upload.folder").findMany({
        where: filters,
        orderBy: { name: "asc" },
        populate: ["parent"],
      })

      // Get file counts for each folder
      const foldersWithCounts = await Promise.all(
        folders.map(async (folder: any) => {
          const fileCount = await strapi.db.query("plugin::upload.file").count({
            where: { folder: folder.id },
          })

          const childCount = await strapi.db.query("plugin::upload.folder").count({
            where: { parent: folder.id },
          })

          return {
            id: folder.id,
            documentId: folder.documentId,
            name: folder.name,
            path: folder.path,
            pathId: folder.pathId,
            parent: folder.parent ? { id: folder.parent.id, name: folder.parent.name } : null,
            files: { count: fileCount },
            children: { count: childCount },
          }
        })
      )

      ctx.body = { data: foldersWithCounts }
    } catch (error) {
      strapi.log.error("Error fetching media folders:", error)
      ctx.throw(500, "Failed to fetch media folders")
    }
  },
})

export default controller
