/**
 * Media folder routes
 * Exposes upload plugin folders via REST API
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/admin/media-folders",
      handler: "media-folder.find",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}
