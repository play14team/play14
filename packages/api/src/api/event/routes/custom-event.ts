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
    {
      method: "POST",
      path: "/events/:slug/publish",
      handler: "custom-event.publishEvent",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Publish a draft event (organizer only)",
      },
    },
    {
      method: "POST",
      path: "/events/:slug/unpublish",
      handler: "custom-event.unpublishEvent",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Unpublish an event (organizer only)",
      },
    },
    {
      method: "GET",
      path: "/events/:slug/preview",
      handler: "custom-event.previewEvent",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Preview a draft event (organizer only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:slug/finance",
      handler: "custom-event.updateFinance",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update event finance data (organizer only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:slug/media-links",
      handler: "custom-event.updateMediaLinks",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update event media links (organizer only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:slug/schedule",
      handler: "custom-event.updateSchedule",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update event schedule/timetable (organizer only)",
      },
    },
    // Image management routes
    {
      method: "POST",
      path: "/events/:slug/images",
      handler: "custom-event.uploadImage",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload an image to event (organizer only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:slug/images/:field",
      handler: "custom-event.setImageFromLibrary",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Set existing library image as event image (organizer only)",
      },
    },
    {
      method: "DELETE",
      path: "/events/:slug/images/:field/:fileId",
      handler: "custom-event.removeImage",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Remove image from event (organizer only)",
      },
    },
    // Sponsorship management route
    {
      method: "PUT",
      path: "/events/:slug/sponsorships",
      handler: "custom-event.updateSponsorships",
      info: { apiName: "event", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update event sponsorships (organizer only)",
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
