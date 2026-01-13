/**
 * Feature flags configuration
 *
 * All feature flags use environment variables with NEXT_PUBLIC_ prefix
 * to make them available in both server and client components.
 */
export const featureFlags = {
  /**
   * Controls whether login functionality is available
   * When false, login buttons and links will be hidden
   */
  loginEnabled:
    process.env.NEXT_PUBLIC_FEATURE_LOGIN_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_FEATURE_LOGIN_ENABLED === "1",
} as const
