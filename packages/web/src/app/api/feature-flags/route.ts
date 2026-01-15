import { NextResponse } from "next/server"

/**
 * Feature Flags API Endpoint
 *
 * Returns server-evaluated feature flags. This is secure because:
 * 1. Flags are evaluated server-side from environment variables
 * 2. Users can see the response but cannot modify server-side evaluation
 * 3. Feature flags control UI visibility, not access control
 *
 * Note: Always enforce actual permissions/authentication server-side,
 * never rely on feature flags for security.
 */
export async function GET() {
  const flags = {
    loginEnabled: process.env.FEATURE_LOGIN_ENABLED === "true",
  }

  return NextResponse.json(flags, {
    headers: {
      // Cache for 1 minute on CDN, allow stale for 5 minutes while revalidating
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  })
}
