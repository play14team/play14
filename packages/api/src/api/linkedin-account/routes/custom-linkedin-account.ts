/**
 * Custom routes for LinkedIn account management
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/admin/linkedin/connect/authorize",
      handler: "custom-linkedin-account.getAuthorizationUrl",
      info: { apiName: "linkedin-account", type: "content-api" },
      config: {
        description: "Get LinkedIn OAuth authorization URL",
      },
    },
    {
      method: "GET",
      path: "/linkedin/oauth/callback",
      handler: "custom-linkedin-account.handleCallback",
      info: { apiName: "linkedin-account", type: "content-api" },
      config: {
        description: "Handle LinkedIn OAuth callback (public - redirects to frontend)",
      },
    },
    {
      method: "GET",
      path: "/admin/linkedin/connect/status",
      handler: "custom-linkedin-account.getAccountStatus",
      info: { apiName: "linkedin-account", type: "content-api" },
      config: {
        description: "Get current user's LinkedIn account status",
      },
    },
    {
      method: "POST",
      path: "/admin/linkedin/connect/disconnect",
      handler: "custom-linkedin-account.disconnectAccount",
      info: { apiName: "linkedin-account", type: "content-api" },
      config: {
        description: "Disconnect LinkedIn account",
      },
    },
  ],
}
