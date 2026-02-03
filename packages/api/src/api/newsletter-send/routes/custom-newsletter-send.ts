/**
 * Custom routes for newsletter management
 * These routes allow founders to manage and send newsletters
 */

export default {
  routes: [
    // CRUD routes
    {
      method: "GET",
      path: "/admin/newsletters",
      handler: "custom-newsletter-send.list",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "List all newsletters with pagination (founders only)",
      },
    },
    {
      method: "GET",
      path: "/admin/newsletters/:id",
      handler: "custom-newsletter-send.findOne",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get a single newsletter for editing (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/newsletters",
      handler: "custom-newsletter-send.create",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new newsletter draft (founders only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/newsletters/:id",
      handler: "custom-newsletter-send.update",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update a newsletter draft (founders only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/newsletters/:id",
      handler: "custom-newsletter-send.delete",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Delete a newsletter draft (founders only)",
      },
    },
    // Send operations
    {
      method: "GET",
      path: "/admin/newsletters/audience-count",
      handler: "custom-newsletter-send.audienceCount",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get the count of newsletter subscribers (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/newsletters/:id/send-test",
      handler: "custom-newsletter-send.sendTest",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Send a test email to the founder's email (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/newsletters/:id/send",
      handler: "custom-newsletter-send.send",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Send the newsletter to all subscribers (founders only)",
      },
    },
    {
      method: "GET",
      path: "/admin/newsletters/:id/preview",
      handler: "custom-newsletter-send.preview",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get rendered HTML preview of the newsletter (founders only)",
      },
    },
    // AI routes
    {
      method: "POST",
      path: "/admin/newsletters/ai/generate",
      handler: "custom-newsletter-send.aiGenerate",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Generate newsletter content using AI (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/newsletters/ai/improve",
      handler: "custom-newsletter-send.aiImprove",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Improve newsletter content using AI (founders only)",
      },
    },
    {
      method: "POST",
      path: "/admin/newsletters/ai/subjects",
      handler: "custom-newsletter-send.aiSuggestSubjects",
      info: { apiName: "newsletter-send", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Generate subject line suggestions using AI (founders only)",
      },
    },
  ],
}
