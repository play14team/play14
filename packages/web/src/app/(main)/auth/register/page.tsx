import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getAuthState, getOAuthConnectUrl } from "@/libs/auth"
import { featureFlags } from "@/libs/feature-flags"
import LoginButtons from "@/components/auth/login-buttons"
import RegisterForm from "@/components/auth/register-form"
import Logo from "@/components/layout/logo"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Register",
  description: "Create an account to join the #play14 community",
}

interface RegisterPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  // Block access if login feature is disabled
  if (!featureFlags.loginEnabled) {
    notFound()
  }

  const params = await searchParams
  const { isAuthenticated } = await getAuthState()

  // If already authenticated, redirect to admin (onboarding will handle no-player case)
  if (isAuthenticated) {
    redirect(params.callbackUrl || "/admin")
  }

  const callbackUrl = params.callbackUrl || "/admin"
  const googleUrl = getOAuthConnectUrl("google")
  const microsoftUrl = getOAuthConnectUrl("microsoft")
  const githubUrl = getOAuthConnectUrl("github")
  const linkedinUrl = getOAuthConnectUrl("linkedin")

  return (
    <div className="auth-login-page">
      <div className="auth-login-card">
        <div className="auth-login-header">
          <Logo width={120} height={40} />
          <h1>Create account</h1>
          <p>Join the #play14 community</p>
        </div>

        {params.error && (
          <div className="auth-error-message">
            {params.error === "email_taken"
              ? "This email is already registered. Please sign in instead."
              : "An error occurred during registration. Please try again."}
          </div>
        )}

        <LoginButtons
          googleUrl={googleUrl}
          microsoftUrl={microsoftUrl}
          githubUrl={githubUrl}
          linkedinUrl={linkedinUrl}
          callbackUrl={callbackUrl}
        />

        <div className="auth-login-divider">
          <span>or register with email</span>
        </div>

        <RegisterForm callbackUrl={callbackUrl} />

        <div className="auth-login-footer">
          <p>
            Already have an account?{" "}
            <Link href={`/auth/login${callbackUrl !== "/admin" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
