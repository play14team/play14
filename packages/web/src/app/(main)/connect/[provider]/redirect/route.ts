import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIE_NAME = "play14_auth"
const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

/**
 * Validate callback URL to prevent open redirect attacks
 */
function isValidCallbackUrl(url: string): boolean {
  // Only allow relative paths starting with /
  if (url.startsWith("/") && !url.startsWith("//")) {
    return true
  }
  return false
}

/**
 * OAuth callback route handler
 *
 * This route handles the callback from Strapi after OAuth authentication.
 * Strapi redirects here with the access_token from the OAuth provider.
 *
 * Flow:
 * 1. User clicks "Login with Google/GitHub"
 * 2. Frontend redirects to ${STRAPI_URL}/api/connect/{provider}
 * 3. Strapi handles OAuth flow with the provider
 * 4. Provider redirects back to Strapi callback URL
 * 5. Strapi redirects to this route with the provider's access_token
 * 6. We exchange the provider token for a Strapi JWT via /api/auth/{provider}/callback
 * 7. We store the Strapi JWT in an httpOnly cookie
 * 8. Redirect user to /admin (or their original destination)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const searchParams = request.nextUrl.searchParams

  // Get the access token from the OAuth provider (via Strapi's redirect)
  const providerToken = searchParams.get("access_token")

  // Handle errors from Strapi/OAuth provider
  const error = searchParams.get("error")
  if (error) {
    console.error(`[OAuth] Error from ${provider}:`, error)
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!providerToken) {
    console.error(`[OAuth] No access token received from ${provider}`)
    return NextResponse.redirect(
      new URL("/auth/error?error=no_token", request.url)
    )
  }

  // Exchange the provider's access_token for a Strapi JWT
  // This is required because the token from the OAuth provider is NOT the Strapi JWT
  const exchangeUrl = `${STRAPI_URL}/api/auth/${provider}/callback?access_token=${providerToken}`
  console.log(`[OAuth] Exchanging ${provider} token for Strapi JWT`)
  console.log(`[OAuth] Exchange URL:`, exchangeUrl.substring(0, 100) + "...")
  try {
    const callbackResponse = await fetch(exchangeUrl)

    console.log(`[OAuth] Exchange response status:`, callbackResponse.status)
    if (!callbackResponse.ok) {
      const errorData = await callbackResponse.text()
      console.error(`[OAuth] Failed to exchange token (${callbackResponse.status}):`, errorData)
      // Try to parse as JSON to get more specific error
      let errorCode = "token_exchange_failed"
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.error?.message?.includes("Email is already taken")) {
          errorCode = "email_taken"
        } else if (errorJson.error?.message) {
          console.error(`[OAuth] Strapi error message:`, errorJson.error.message)
        }
      } catch {
        // Not JSON, use raw error
      }
      return NextResponse.redirect(
        new URL(`/auth/error?error=${errorCode}`, request.url)
      )
    }

    const data = await callbackResponse.json()
    const strapiJwt = data.jwt

    if (!strapiJwt) {
      console.error(`[OAuth] No JWT in Strapi response:`, data)
      return NextResponse.redirect(
        new URL("/auth/error?error=no_jwt", request.url)
      )
    }

    console.log(`[OAuth] Successfully obtained Strapi JWT for user:`, data.user?.email)

    // Get the callback URL (where the user wanted to go before login)
    // Validate to prevent open redirect attacks
    const requestedCallbackUrl = searchParams.get("callbackUrl")
    const callbackUrl =
      requestedCallbackUrl && isValidCallbackUrl(requestedCallbackUrl)
        ? requestedCallbackUrl
        : "/admin"

    // Create redirect response and set Strapi JWT cookie
    const response = NextResponse.redirect(new URL(callbackUrl, request.url))

    response.cookies.set(AUTH_COOKIE_NAME, strapiJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (err) {
    console.error(`[OAuth] Token exchange error:`, err)
    return NextResponse.redirect(
      new URL("/auth/error?error=token_exchange_error", request.url)
    )
  }
}
