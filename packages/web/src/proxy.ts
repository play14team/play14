import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

const AUTH_COOKIE_NAME = "play14_auth"

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Proxy that handles:
 * 1. Locale detection and redirection (via next-intl)
 * 2. Admin route protection (auth cookie check)
 */
export function proxy(request: NextRequest) {
  // Run next-intl middleware first for locale detection and redirection
  const intlResponse = intlMiddleware(request)

  // Check if the request is for an admin route
  // With localePrefix "as-needed", default locale has no prefix (/admin)
  // while non-default locales have a prefix (/fr/admin)
  const { pathname } = request.nextUrl
  const adminPattern = /^\/(?:[a-z]{2}\/)?admin/
  if (!adminPattern.test(pathname)) {
    return intlResponse
  }

  // Check for auth cookie on admin routes
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)
  console.log("[Proxy] Path:", pathname, "- Cookie present:", !!authCookie?.value)

  if (!authCookie?.value) {
    // Extract locale: if path starts with a locale prefix use it, otherwise use default
    const localeMatch = pathname.match(/^\/([a-z]{2})\/admin/)
    const locale = localeMatch ? localeMatch[1] : "en"
    const loginPrefix = locale === "en" ? "" : `/${locale}`
    const loginUrl = new URL(`${loginPrefix}/auth/login`, request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    console.log("[Proxy] Redirecting to login:", loginUrl.toString())
    return NextResponse.redirect(loginUrl)
  }

  console.log("[Proxy] Cookie valid, proceeding to:", pathname)
  return intlResponse
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|favicon|values|play14_broken|.*\\..*).*)", "/"],
}
