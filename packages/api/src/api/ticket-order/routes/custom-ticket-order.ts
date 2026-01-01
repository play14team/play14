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
  ],
}
