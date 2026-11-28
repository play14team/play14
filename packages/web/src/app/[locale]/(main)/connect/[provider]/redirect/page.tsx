"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import Logo from "@/components/layout/logo"
import { exchangeOAuthSession, isOAuthProvider } from "@/libs/oauth-exchange"

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"

function goToError(code: string) {
  window.location.replace(`/auth/error?error=${encodeURIComponent(code)}`)
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
 *    httpOnly `play14_auth` cookie
 * 5. Full navigation to /auth/callback, which restores the original
 *    destination from sessionStorage
 *
 * This used to be a server route that read `?access_token=` and did the
 * exchange server-side. Strapi no longer puts tokens in the URL, and a
 * server-side fetch can't carry the browser's session cookie.
 */
export default function OAuthRedirectPage() {
  const t = useTranslations("auth.callback")
  const { provider } = useParams<{ provider: string }>()
  const searchParams = useSearchParams()
  // Strapi's session response is single-use; guard against React Strict
  // Mode's double effect run in development.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const error = searchParams.get("error")
    if (error) {
      console.error(`[OAuth] Error from ${provider}:`, error, searchParams.get("error_description"))
      goToError(error)
      return
    }

    if (!isOAuthProvider(provider)) {
      goToError("token_exchange_failed")
      return
    }

    ;(async () => {
      const result = await exchangeOAuthSession(STRAPI_URL, provider)
      if (!result.ok) {
        console.error(`[OAuth] Exchange with ${provider} failed:`, result.error)
        goToError(result.error)
        return
      }

      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jwt: result.jwt }),
        })
        if (!response.ok) {
          goToError("token_exchange_failed")
          return
        }
      } catch {
        goToError("token_exchange_failed")
        return
      }

      // Full navigation so server components pick up the new auth cookie.
      window.location.replace("/auth/callback")
    })()
  }, [provider, searchParams])

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
