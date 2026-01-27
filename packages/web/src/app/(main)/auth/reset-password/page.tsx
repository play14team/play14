import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import ResetPasswordForm from "@/components/auth/reset-password-form"
import Logo from "@/components/layout/logo"
import { getAuthState } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"

export const metadata: Metadata = {
  title: "Set Password",
  description: "Set a password for your #play14 account",
}

interface ResetPasswordPageProps {
  searchParams: Promise<{ code?: string; callbackUrl?: string }>
}

function normalizeCallbackUrl(callbackUrl?: string): string {
  if (callbackUrl?.startsWith("/")) {
    return callbackUrl
  }
  return "/admin"
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  // Block access if login feature is disabled
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    notFound()
  }

  const params = await searchParams
  const callbackUrl = normalizeCallbackUrl(params.callbackUrl)
  const { isAuthenticated } = await getAuthState()

  if (isAuthenticated) {
    redirect(callbackUrl)
  }

  const code = params.code || null
  const loginLink =
    callbackUrl !== "/admin"
      ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/auth/login"

  return (
    <div className="auth-login-page">
      <div className="auth-login-card">
        <div className="auth-login-header">
          <Logo width={120} height={40} />
          <h1>Set your password</h1>
          <p>Activate your #play14 account</p>
        </div>

        {!code && (
          <div className="auth-error-message">
            Invite link is missing or invalid. Please use the link from your invite email.
          </div>
        )}

        <ResetPasswordForm code={code} callbackUrl={callbackUrl} />

        <p className="auth-register-link">
          Already have a password? <Link href={loginLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
