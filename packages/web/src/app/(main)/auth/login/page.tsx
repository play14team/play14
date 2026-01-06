import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthState, getOAuthConnectUrl } from "@/libs/auth"
import LoginButtons from "@/components/auth/login-buttons"
import LoginForm from "@/components/auth/login-form"
import Logo from "@/components/layout/logo"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to access the #play14 admin panel",
}

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const { isAuthenticated } = await getAuthState()

  // If already authenticated, redirect to admin
  if (isAuthenticated) {
    redirect(params.callbackUrl || "/admin")
  }

  const callbackUrl = params.callbackUrl || "/admin"
  const googleUrl = getOAuthConnectUrl("google")
  const githubUrl = getOAuthConnectUrl("github")
  const linkedinUrl = getOAuthConnectUrl("linkedin")

  return (
    <div className="auth-login-page">
      <div className="auth-login-card">
        <div className="auth-login-header">
          <Logo width={120} height={40} />
          <h1>Sign in</h1>
          <p>Sign in to access the admin panel</p>
        </div>

        {params.error && (
          <div className="auth-error-message">
            {params.error === "session_expired"
              ? "Your session has expired. Please sign in again."
              : "An error occurred during sign in. Please try again."}
          </div>
        )}

        <LoginButtons
          googleUrl={googleUrl}
          githubUrl={githubUrl}
          linkedinUrl={linkedinUrl}
          callbackUrl={callbackUrl}
        />

        <div className="auth-login-divider">
          <span>or sign in with email</span>
        </div>

        <LoginForm callbackUrl={callbackUrl} />

        <p className="auth-register-link">
          Don&apos;t have an account?{" "}
          <Link href={`/auth/register${callbackUrl !== "/admin" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
