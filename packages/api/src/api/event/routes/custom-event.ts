/**
 * Custom routes for events
 * Includes slug lookup and event creation for organizers
 *
 * IMPORTANT: Specific routes (locations, venues, create) MUST come before
 * the generic :slug route to avoid being matched as slug parameters
 */

export default {
  routes: [
    // Organizer routes - MUST be before :slug route
    {
      method: "GET",
      path: "/events/my-events",
      handler: "custom-event.getMyEvents",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get events for the current organizer (Host/Mentor/Founder)",
      },
    },
    {
      method: "GET",
      path: "/events/locations",
      handler: "custom-event.getLocations",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get available locations for event creation",
      },
    },
    {
      method: "GET",
      path: "/events/venues",
      handler: "custom-event.getVenues",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get available venues for event creation",
      },
    },
    {
      method: "GET",
      path: "/events/organizers",
      handler: "custom-event.getOrganizers",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get available organizers (hosts/mentors/founders) for event management",
      },
    },
    {
      method: "POST",
      path: "/events/create",
      handler: "custom-event.createEvent",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new event with default schedule and tickets (Host/Mentor/Founder only)",
      },
    },
    // Event edit routes - MUST be before :slug catch-all
    {
      method: "GET",
      path: "/events/:slug/edit",
      handler: "custom-event.getEventForEdit",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get event data for editing (organizer only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:slug/edit",
      handler: "custom-event.updateEvent",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update event (organizer only)",
      },
    },
    // Public route to find event by slug - MUST be last (catch-all pattern)
    {
      method: "GET",
      path: "/events/:slug",
      handler: "event.findOne",
      info: { apiName: "event", type: "content-api" },
    },
  ],
}
