/**
 * Custom routes for ticket type management
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/events/:eventId/ticket-types",
      handler: "custom-ticket-type.createTicketType",
      info: { apiName: "ticket-type", type: "content-api" },
      config: {
        description: "Create a ticket type for an event (host/mentor/founder only)",
      },
    },
    {
      method: "PUT",
      path: "/ticket-types/:id",
      handler: "custom-ticket-type.updateTicketType",
      info: { apiName: "ticket-type", type: "content-api" },
      config: {
        description: "Update a ticket type (host/mentor/founder only)",
      },
    },
    {
      method: "DELETE",
      path: "/ticket-types/:id",
      handler: "custom-ticket-type.deleteTicketType",
      info: { apiName: "ticket-type", type: "content-api" },
      config: {
        description: "Delete a ticket type (host/mentor/founder only)",
      },
    },
    {
      method: "GET",
      path: "/events/:eventId/orders",
      handler: "custom-ticket-type.getEventOrders",
      info: { apiName: "ticket-type", type: "content-api" },
      config: {
        description: "Get orders for an event (host/mentor/founder only)",
      },
    },
  ],
}
