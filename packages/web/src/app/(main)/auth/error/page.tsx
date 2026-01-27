import type { Metadata } from "next"
import Link from "next/link"
import Logo from "@/components/layout/logo"

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "An error occurred during authentication",
}

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>
}

const errorMessages: Record<string, { title: string; message: string }> = {
  no_token: {
    title: "Authentication Failed",
    message: "No authentication token was received. Please try signing in again.",
  },
  session_expired: {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again to continue.",
  },
  no_player: {
    title: "No Player Profile",
    message:
      "Your account is not linked to a player profile. Please contact an administrator to link your account.",
  },
  access_denied: {
    title: "Access Denied",
    message: "You do not have permission to access the admin panel.",
  },
  email_taken: {
    title: "Email Already Registered",
    message:
      "This email is already associated with another account using a different login provider. Please sign in with your original provider.",
  },
  token_exchange_failed: {
    title: "Authentication Failed",
    message: "Failed to complete authentication with the provider. Please try again.",
  },
  default: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred during authentication. Please try again.",
  },
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams
  const errorCode = params.error || "default"
  const errorInfo = errorMessages[errorCode] || errorMessages.default

  return (
    <div className="auth-error-page">
      <div className="auth-error-card">
        <div className="auth-error-header">
          <Logo width={120} height={40} />
        </div>

        <div className="auth-error-content">
          <div className="auth-error-icon">
            <i className="bx bx-error-circle" />
          </div>
          <h1>{errorInfo.title}</h1>
          <p>{errorInfo.message}</p>
        </div>

        <div className="auth-error-actions">
          <Link href="/auth/login" className="btn btn-primary">
            Try Again
          </Link>
          <Link href="/" className="btn btn-outline">
            Go Home
          </Link>
        </div>

        {errorCode === "no_player" && (
          <div className="auth-error-contact">
            <p>
              Need help? <Link href="/contact">Contact the #play14 community</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
