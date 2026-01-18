/**
 * Custom routes for event location management
 * These routes allow organizers to manage event locations
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/admin/event-locations",
      handler: "custom-event-location.list",
      info: { apiName: "event-location", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "List all event locations with pagination and filters (organizers only)",
      },
    },
    {
      method: "GET",
      path: "/admin/event-locations/:id",
      handler: "custom-event-location.findOne",
      info: { apiName: "event-location", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get a single event location for editing (organizers only)",
      },
    },
    {
      method: "POST",
      path: "/admin/event-locations",
      handler: "custom-event-location.create",
      info: { apiName: "event-location", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new event location (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/event-locations/:id",
      handler: "custom-event-location.update",
      info: { apiName: "event-location", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update an event location (organizers only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/event-locations/:id",
      handler: "custom-event-location.delete",
      info: { apiName: "event-location", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Delete an event location if it has no events (organizers only)",
      },
    },
  ],
}
