/**
 * Custom routes for ticket management
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/tickets/me",
      handler: "custom-ticket.getMyTickets",
      info: { apiName: "ticket", type: "content-api" },
      config: {
        description: "Get current user's tickets across all orders",
      },
    },
    {
      method: "GET",
      path: "/tickets/:ticketId",
      handler: "custom-ticket.getTicketDetails",
      info: { apiName: "ticket", type: "content-api" },
      config: {
        auth: false,
        description: "Get ticket details by document ID or ticket code",
      },
    },
  ],
}
