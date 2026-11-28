"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import Logo from "@/components/layout/logo"
import { completeOAuthRedirect, exchangeOAuthSession } from "@/libs/oauth-exchange"

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"

async function storeSession(jwt: string): Promise<boolean> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jwt }),
  })
  return response.ok
}

/**
 * OAuth landing page: Strapi redirects here after the provider round-trip.
 *
 * Flow:
 * 1. User clicks "Continue with Google/…" → ${STRAPI_URL}/api/connect/{provider}
 * 2. Strapi runs the OAuth flow and keeps the provider tokens in its session
 *    (`strapi.sid` cookie on the API domain), then redirects here with an
 *    empty query string (or `?error=` on failure)
 * 3. This page calls /api/auth/{provider}/callback from the browser with
 *    credentials, so the session cookie is sent and Strapi returns a JWT
 * 4. The JWT is POSTed to /api/auth/session, which stores it in the
 *    httpOnly `play14_auth` cookie. The JWT only lives in memory here and is
 *    never logged or persisted client-side.
 * 5. Full navigation to /auth/callback, which restores the original
 *    destination from sessionStorage
 *
 * The logic lives in `completeOAuthRedirect` (unit-tested). The query string
 * is read inside the effect rather than via `useSearchParams`, so the page
 * needs no Suspense boundary.
 */
export default function OAuthRedirectPage() {
  const t = useTranslations("auth.callback")
  const { provider } = useParams<{ provider: string }>()
  // Strapi's session response is single-use; guard against React Strict
  // Mode's double effect run in development.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    completeOAuthRedirect(provider, window.location.search, {
      exchange: (p) => exchangeOAuthSession(STRAPI_URL, p),
      storeSession,
      logError: console.error,
    }).then((destination) => {
      // Full navigation so server components pick up the new auth cookie.
      window.location.replace(destination)
    })
  }, [provider])

  return (
    <div className="auth-error-page">
      <div className="auth-error-card">
        <div className="auth-error-header">
          <Logo width={120} height={40} />
        </div>

        <div className="auth-error-content">
          <div className="auth-error-icon">
            <i className="bx bx-loader-alt bx-spin" />
          </div>
          <h1>{t("signingIn")}</h1>
          <p>{t("pleaseWait")}</p>
        </div>
      </div>
    </div>
  )
}
