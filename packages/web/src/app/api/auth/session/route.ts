import { type NextRequest, NextResponse } from "next/server"
import { setAuthCookie } from "@/libs/auth"

function getStrapiUrl(): string {
  return process.env.STRAPI_API_URL || "http://localhost:1337"
}

/**
 * Accept the origin the request was actually sent to, plus the configured
 * public site URL (behind Clever Cloud's proxy `request.nextUrl.origin` can be
 * the internal container address).
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  const allowed = new Set([request.nextUrl.origin])
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (publicUrl) {
    try {
      allowed.add(new URL(publicUrl).origin)
    } catch {
      // ignore a malformed NEXT_PUBLIC_SITE_URL
    }
  }
  return allowed.has(origin)
}

/**
 * Store a Strapi JWT obtained by the browser-side OAuth exchange
 * (see `@/libs/oauth-exchange`) in the httpOnly `play14_auth` cookie.
 *
 * Guards:
 * - Same-origin only, so another site cannot plant its own session here
 *   (login CSRF).
 * - The JWT is checked against Strapi's `/api/users/me` before it is stored,
 *   so the cookie only ever holds a token Strapi accepts.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let jwt: unknown
  try {
    ;({ jwt } = await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  if (typeof jwt !== "string" || jwt.length === 0) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  try {
    const me = await fetch(`${getStrapiUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    })
    if (!me.ok) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 })
    }
  } catch (err) {
    console.error("[OAuth] Failed to validate JWT with Strapi:", err)
    return NextResponse.json({ error: "validation_failed" }, { status: 502 })
  }

  await setAuthCookie(jwt)
  return NextResponse.json({ success: true })
}
