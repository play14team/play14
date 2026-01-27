import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const AUTH_COOKIE_NAME = "play14_auth"

/**
 * Proxy to protect admin routes
 *
 * Checks for authentication cookie and redirects to login if not present.
 * Additional player verification is done at the page level since proxy
 * runs before the request is completed.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  console.log("[Proxy] Path:", pathname, "- Cookie present:", !!authCookie?.value)

  if (!authCookie?.value) {
    // Redirect to login with callback URL
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    console.log("[Proxy] Redirecting to login:", loginUrl.toString())
    return NextResponse.redirect(loginUrl)
  }

  // Cookie exists, allow request to continue
  // Player verification is done at page level
  console.log("[Proxy] Cookie valid, proceeding to:", pathname)
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
