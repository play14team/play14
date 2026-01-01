/**
 * Webhook routes for payment processing
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/webhooks/stripe",
      handler: "webhook.handleStripeWebhook",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        auth: false,
        description: "Handle Stripe webhook events",
      },
    },
  ],
}
