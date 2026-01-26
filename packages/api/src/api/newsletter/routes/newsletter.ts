/**
 * Newsletter subscription routes
 *
 * Public endpoint for subscribing to the newsletter via Resend Audiences
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/newsletter/subscribe",
      handler: "newsletter.subscribe",
      info: { apiName: "newsletter", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Subscribe to the newsletter",
      },
    },
  ],
}
