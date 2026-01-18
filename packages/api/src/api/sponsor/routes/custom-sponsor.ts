/**
 * Custom routes for sponsor management
 * These routes allow organizers to manage sponsors
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/admin/sponsors",
      handler: "custom-sponsor.list",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "List all sponsors with pagination and filters (organizers only)",
      },
    },
    {
      method: "GET",
      path: "/admin/sponsors/:id",
      handler: "custom-sponsor.findOne",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get a single sponsor for editing (organizers only)",
      },
    },
    {
      method: "POST",
      path: "/admin/sponsors",
      handler: "custom-sponsor.create",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new sponsor (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/sponsors/:id",
      handler: "custom-sponsor.update",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update a sponsor (organizers only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/sponsors/:id",
      handler: "custom-sponsor.delete",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Delete a sponsor if it has no events (organizers only)",
      },
    },
    {
      method: "POST",
      path: "/admin/sponsors/:id/logo",
      handler: "custom-sponsor.uploadLogo",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload a logo for a sponsor (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/sponsors/:id/logo/library",
      handler: "custom-sponsor.setLogoFromLibrary",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Set an existing media library image as sponsor logo (organizers only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/sponsors/:id/logo",
      handler: "custom-sponsor.removeLogo",
      info: { apiName: "sponsor", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Remove logo from sponsor (organizers only)",
      },
    },
  ],
}
