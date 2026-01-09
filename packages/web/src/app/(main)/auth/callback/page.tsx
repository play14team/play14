"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Logo from "@/components/layout/logo"

const SESSION_STORAGE_KEY = "auth_callback_url"
const DEFAULT_REDIRECT = "/admin"

/**
 * Auth callback page that handles post-OAuth redirect.
 *
 * This page reads the callback URL from sessionStorage (set by AuthGate)
 * and redirects the user to their original destination after OAuth login.
 *
 * This is necessary because:
 * 1. The OAuth flow goes through Strapi (server-side)
 * 2. The OAuth redirect route is server-side and cannot access sessionStorage
 * 3. This client-side page can read sessionStorage and complete the redirect
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for callback URL in sessionStorage (set by AuthGate before OAuth)
    const storedCallbackUrl = sessionStorage.getItem(SESSION_STORAGE_KEY)

    // Clean up sessionStorage
    sessionStorage.removeItem(SESSION_STORAGE_KEY)

    // Check for fallback from query params (in case someone navigates here directly)
    const queryCallbackUrl = searchParams.get("callbackUrl")

    // Determine the final redirect URL
    let redirectUrl = DEFAULT_REDIRECT

    if (storedCallbackUrl && isValidCallbackUrl(storedCallbackUrl)) {
      redirectUrl = storedCallbackUrl
    } else if (queryCallbackUrl && isValidCallbackUrl(queryCallbackUrl)) {
      redirectUrl = queryCallbackUrl
    }

    // Redirect to the destination
    router.replace(redirectUrl)
  }, [router, searchParams])

  return (
    <div className="auth-error-page">
      <div className="auth-error-card">
        <div className="auth-error-header">
          <Logo width={120} height={40} />
        </div>

        <div className="auth-error-content">
          <div className="auth-error-icon">
            <i className="bx bx-loader-alt bx-spin"></i>
          </div>
          <h1>Signing you in...</h1>
          <p>Please wait while we complete your sign-in.</p>
        </div>
      </div>
    </div>
  )
}

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
