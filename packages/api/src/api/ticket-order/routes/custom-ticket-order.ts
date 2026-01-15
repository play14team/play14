/**
 * Custom routes for ticket orders
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/events/:eventId/tickets",
      handler: "custom-ticket-order.getAvailableTickets",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        auth: false,
        description: "Get available ticket types for an event",
      },
    },
    {
      method: "POST",
      path: "/ticket-orders",
      handler: "custom-ticket-order.initiateOrder",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Initiate a ticket order and get checkout URL",
      },
    },
    {
      method: "GET",
      path: "/ticket-orders/me",
      handler: "custom-ticket-order.getMyOrders",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Get current user's ticket orders",
      },
    },
    {
      method: "GET",
      path: "/ticket-orders/:orderId",
      handler: "custom-ticket-order.getOrderStatus",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        auth: false,
        description: "Get order status and ticket details",
      },
    },
    {
      method: "POST",
      path: "/ticket-orders/:orderId/refund",
      handler: "custom-ticket-order.requestRefund",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Request refund for an order",
      },
    },
    {
      method: "POST",
      path: "/ticket-orders/:orderId/cancel",
      handler: "custom-ticket-order.cancelOrder",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Cancel a pending order (requires authentication and ownership)",
      },
    },
    // Draft order flow - multi-step checkout with attendee information
    {
      method: "POST",
      path: "/ticket-orders/draft",
      handler: "custom-ticket-order.createDraftOrder",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Create a draft order to collect attendee information",
      },
    },
    {
      method: "PUT",
      path: "/ticket-orders/:orderId/attendees",
      handler: "custom-ticket-order.updateAttendeeInfo",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Update attendee information for a draft order",
      },
    },
    {
      method: "POST",
      path: "/ticket-orders/:orderId/checkout",
      handler: "custom-ticket-order.finalizeCheckout",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Finalize a draft order and create payment session",
      },
    },
    {
      method: "GET",
      path: "/ticket-orders/:orderId/invoice",
      handler: "custom-ticket-order.downloadInvoice",
      info: { apiName: "ticket-order", type: "content-api" },
      config: {
        description: "Download invoice PDF for a paid order",
      },
    },
  ],
}
