/**
 * Custom routes for LinkedIn post management
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/admin/events/:slug/linkedin/preview",
      handler: "custom-linkedin-post.previewPost",
      info: { apiName: "linkedin-post", type: "content-api" },
      config: {
        description: "Preview LinkedIn post content for an event",
      },
    },
    {
      method: "POST",
      path: "/admin/events/:slug/linkedin/post",
      handler: "custom-linkedin-post.postManually",
      info: { apiName: "linkedin-post", type: "content-api" },
      config: {
        description: "Post to LinkedIn using host's personal account",
      },
    },
    {
      method: "GET",
      path: "/admin/events/:slug/linkedin/history",
      handler: "custom-linkedin-post.getPostHistory",
      info: { apiName: "linkedin-post", type: "content-api" },
      config: {
        description: "Get LinkedIn post history for an event",
      },
    },
    {
      method: "POST",
      path: "/admin/events/:slug/linkedin/regenerate",
      handler: "custom-linkedin-post.regenerateContent",
      info: { apiName: "linkedin-post", type: "content-api" },
      config: {
        description: "Regenerate AI content for a LinkedIn post",
      },
    },
  ],
}
