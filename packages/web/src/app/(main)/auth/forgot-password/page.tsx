import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import ForgotPasswordForm from "@/components/auth/forgot-password-form"
import Logo from "@/components/layout/logo"
import { getAuthState } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your #play14 account password",
}

export default async function ForgotPasswordPage() {
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    notFound()
  }

  const { isAuthenticated } = await getAuthState()
  if (isAuthenticated) {
    redirect("/admin")
  }

  return (
    <div className="auth-login-page">
      <div className="auth-login-card" style={{ maxWidth: 440 }}>
        <div className="auth-login-header">
          <Logo width={120} height={40} />
          <h1>Forgot your password?</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        <ForgotPasswordForm />

        <p className="auth-register-link">
          <Link href="/auth/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
