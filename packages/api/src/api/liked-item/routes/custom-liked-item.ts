/**
 * Custom routes for liked-item management
 * These routes allow founders to manage liked items and public access for showcase
 */

export default {
  routes: [
    // Public route (no auth required)
    {
      method: "GET",
      path: "/liked-items/showcase",
      handler: "custom-liked-item.listPublic",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get all liked items for public showcase (no auth required)",
      },
    },
    // Admin routes (founders only)
    {
      method: "GET",
      path: "/admin/liked-items",
      handler: "custom-liked-item.list",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "List all liked items with pagination and filters (founders only)",
      },
    },
    {
      method: "GET",
      path: "/admin/liked-items/:id",
      handler: "custom-liked-item.findOne",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get a single liked item for editing (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/liked-items",
      handler: "custom-liked-item.create",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new liked item (founders only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/liked-items/:id",
      handler: "custom-liked-item.update",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update a liked item (founders only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/liked-items/:id",
      handler: "custom-liked-item.delete",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Delete a liked item (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/liked-items/:id/image",
      handler: "custom-liked-item.uploadImage",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload an image for a liked item (founders only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/liked-items/:id/image/library",
      handler: "custom-liked-item.setImageFromLibrary",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Set an existing media library image as liked item image (founders only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/liked-items/:id/image",
      handler: "custom-liked-item.removeImage",
      info: { apiName: "liked-item", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Remove image from liked item (founders only)",
      },
    },
  ],
}
