import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import LoginButtons from "@/components/auth/login-buttons"
import LoginForm from "@/components/auth/login-form"
import Logo from "@/components/layout/logo"
import { Link } from "@/i18n/navigation"
import { getAuthState, getOAuthConnectUrl } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
}

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Block access if login feature is disabled
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    notFound()
  }

  const params = await searchParams
  const [{ isAuthenticated }, t] = await Promise.all([
    getAuthState(),
    getTranslations("auth.login"),
  ])

  // If already authenticated, redirect to admin
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
          <h1>{t("heading")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        {params.error && (
          <div className="auth-error-message">
            {params.error === "session_expired" ? t("sessionExpired") : t("genericError")}
          </div>
        )}

        <div className="auth-login-content">
          <div className="auth-login-column auth-login-email">
            <h2>{t("emailOrUsername")}</h2>
            <LoginForm callbackUrl={callbackUrl} />
            <p className="auth-forgot-password-link">
              <Link href="/auth/reset-password">{t("forgotPassword")}</Link>
            </p>
          </div>

          <div className="auth-login-divider">
            <span>{t("or")}</span>
          </div>

          <div className="auth-login-column auth-login-sso">
            <h2>{t("sso")}</h2>
            <LoginButtons
              googleUrl={googleUrl}
              microsoftUrl={microsoftUrl}
              githubUrl={githubUrl}
              linkedinUrl={linkedinUrl}
              callbackUrl={callbackUrl}
            />
          </div>
        </div>

        <p className="auth-register-link">
          {t("noAccount")}{" "}
          <Link
            href={`/auth/register${callbackUrl !== "/admin" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          >
            {t("createOne")}
          </Link>
        </p>
      </div>
    </div>
  )
}
