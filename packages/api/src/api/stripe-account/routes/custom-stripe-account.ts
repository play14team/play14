/**
 * Custom routes for Stripe Connect account management
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/stripe/connect/create-account",
      handler: "custom-stripe-account.createAccount",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Create a Stripe Express connected account for the current user",
      },
    },
    {
      method: "GET",
      path: "/stripe/connect/onboarding-link",
      handler: "custom-stripe-account.getOnboardingLink",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Get Stripe onboarding link for the current user's account",
      },
    },
    {
      method: "GET",
      path: "/stripe/connect/dashboard-link",
      handler: "custom-stripe-account.getDashboardLink",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Get Stripe Express dashboard link",
      },
    },
    {
      method: "GET",
      path: "/stripe/connect/status",
      handler: "custom-stripe-account.getAccountStatus",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Get current user's Stripe account status",
      },
    },
    {
      method: "POST",
      path: "/stripe/connect/link-event/:eventId",
      handler: "custom-stripe-account.linkAccountToEvent",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Link Stripe account to an event (host only)",
      },
    },
    {
      method: "POST",
      path: "/stripe/connect/unlink-event/:eventId",
      handler: "custom-stripe-account.unlinkAccountFromEvent",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Unlink Stripe account from an event (host only)",
      },
    },
    {
      method: "GET",
      path: "/stripe/connect/event/:eventId/accounts",
      handler: "custom-stripe-account.getEventHostAccounts",
      info: { apiName: "stripe-account", type: "content-api" },
      config: {
        description: "Get all Stripe accounts from hosts/mentors of an event",
      },
    },
  ],
}
