/**
 * Custom routes for attendance claim management
 * These routes allow players to claim event attendance and organizers to approve/reject claims
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/attendance-claims/events",
      handler: "custom-attendance-claim.getOverEvents",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get events with status 'Over' that can be claimed",
      },
    },
    {
      method: "GET",
      path: "/attendance-claims/events/search",
      handler: "custom-attendance-claim.searchEvents",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Search 'Over' events by name or location",
      },
    },
    {
      method: "GET",
      path: "/attendance-claims/me",
      handler: "custom-attendance-claim.getMyClaims",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get the current player's attendance claims",
      },
    },
    {
      method: "POST",
      path: "/attendance-claims",
      handler: "custom-attendance-claim.submitClaim",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Submit an attendance claim for an event",
      },
    },
    {
      method: "DELETE",
      path: "/attendance-claims/:id",
      handler: "custom-attendance-claim.cancelClaim",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Cancel the player's own pending claim",
      },
    },
    {
      method: "GET",
      path: "/attendance-claims/for-my-events",
      handler: "custom-attendance-claim.getPendingClaimsForMyEvents",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get pending claims for events the player hosts or mentors",
      },
    },
    {
      method: "PUT",
      path: "/attendance-claims/:id/approve",
      handler: "custom-attendance-claim.approveClaim",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Approve an attendance claim (host/mentor only)",
      },
    },
    {
      method: "PUT",
      path: "/attendance-claims/:id/reject",
      handler: "custom-attendance-claim.rejectClaim",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Reject an attendance claim (host/mentor only)",
      },
    },
    {
      method: "GET",
      path: "/attendance-claims/player/:playerDocumentId",
      handler: "custom-attendance-claim.getPendingClaimsForPlayer",
      info: { apiName: "attendance-claim", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        auth: false,
        description: "Get pending attendance claims for a player (public)",
      },
    },
  ],
}
