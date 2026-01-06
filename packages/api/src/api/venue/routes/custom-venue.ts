/**
 * Custom routes for venue management
 * These routes allow organizers to manage venues
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/venues/admin",
      handler: "custom-venue.list",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "List all venues with pagination and filters (organizers only)",
      },
    },
    {
      method: "GET",
      path: "/venues/admin/:id",
      handler: "custom-venue.findOne",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get a single venue for editing (organizers only)",
      },
    },
    {
      method: "POST",
      path: "/venues/admin",
      handler: "custom-venue.create",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new venue (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/venues/admin/:id",
      handler: "custom-venue.update",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update a venue (organizers only)",
      },
    },
    {
      method: "DELETE",
      path: "/venues/admin/:id",
      handler: "custom-venue.delete",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Delete a venue if it has no events (organizers only)",
      },
    },
    {
      method: "POST",
      path: "/venues/admin/:id/logo",
      handler: "custom-venue.uploadLogo",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload a logo for a venue (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/venues/admin/:id/logo/library",
      handler: "custom-venue.setLogoFromLibrary",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Set an existing media library image as venue logo (organizers only)",
      },
    },
    {
      method: "DELETE",
      path: "/venues/admin/:id/logo",
      handler: "custom-venue.removeLogo",
      info: { apiName: "venue", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Remove logo from venue (organizers only)",
      },
    },
  ],
}
