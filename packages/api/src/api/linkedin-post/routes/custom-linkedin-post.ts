export default {
  routes: [
    {
      method: "POST",
      path: "/admin/events/:slug/linkedin/preview",
      handler: "custom-linkedin-post.previewPost",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/admin/events/:slug/linkedin/post",
      handler: "custom-linkedin-post.postManually",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}
