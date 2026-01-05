/**
 * Media file routes
 * Exposes upload plugin files via REST API with folder filtering
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/media-files",
      handler: "media-file.find",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}
