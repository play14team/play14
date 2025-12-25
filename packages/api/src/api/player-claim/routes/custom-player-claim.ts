/**
 * Custom routes for player claim management
 * These routes allow users to claim player profiles and admins to approve/reject claims
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/player-claims/check-match",
      handler: "custom-player-claim.checkMatch",
      config: {
        policies: [],
        middlewares: [],
        description: "Check if the current user's name matches a player exactly",
      },
    },
    {
      method: "GET",
      path: "/player-claims/suggestions",
      handler: "custom-player-claim.getSuggestions",
      config: {
        policies: [],
        middlewares: [],
        description: "Get fuzzy search suggestions for player claiming based on user name",
      },
    },
    {
      method: "GET",
      path: "/player-claims/me",
      handler: "custom-player-claim.findMyClaims",
      config: {
        policies: [],
        middlewares: [],
        description: "Get the current user's pending claims",
      },
    },
    {
      method: "POST",
      path: "/player-claims",
      handler: "custom-player-claim.submitClaim",
      config: {
        policies: [],
        middlewares: [],
        description: "Submit a claim request for a player profile",
      },
    },
    {
      method: "DELETE",
      path: "/player-claims/:id",
      handler: "custom-player-claim.cancelClaim",
      config: {
        policies: [],
        middlewares: [],
        description: "Cancel the user's own pending claim",
      },
    },
    {
      method: "GET",
      path: "/player-claims/pending",
      handler: "custom-player-claim.getPendingClaims",
      config: {
        policies: [],
        middlewares: [],
        description: "List all pending claims (admin only)",
      },
    },
    {
      method: "PUT",
      path: "/player-claims/:id/approve",
      handler: "custom-player-claim.approveClaim",
      config: {
        policies: [],
        middlewares: [],
        description: "Approve a claim request (admin only)",
      },
    },
    {
      method: "PUT",
      path: "/player-claims/:id/reject",
      handler: "custom-player-claim.rejectClaim",
      config: {
        policies: [],
        middlewares: [],
        description: "Reject a claim request (admin only)",
      },
    },
  ],
}
