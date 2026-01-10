/**
 * Prometheus metrics routes
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/metrics",
      handler: "metrics.index",
      config: {
        // No authentication required - security handled in controller
        auth: false,
        policies: [],
        // Disable rate limiting for metrics endpoint
        middlewares: [],
      },
    },
  ],
}
