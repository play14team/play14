import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import LoginButtons from "@/components/auth/login-buttons"
import RegisterForm from "@/components/auth/register-form"
import Logo from "@/components/layout/logo"
import { Link } from "@/i18n/navigation"
import { getAuthState, getOAuthConnectUrl } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
}

interface RegisterPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  // Block access if login feature is disabled
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    notFound()
  }

  const params = await searchParams
  const [{ isAuthenticated }, t] = await Promise.all([
    getAuthState(),
    getTranslations("auth.register"),
  ])

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
          <h1>{t("heading")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        {params.error && (
          <div className="auth-error-message">
            {params.error === "email_taken" ? t("emailTaken") : t("genericError")}
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
          <span>{t("orRegisterWithEmail")}</span>
        </div>

        <RegisterForm callbackUrl={callbackUrl} />

        <div className="auth-login-footer">
          <p>
            {t("alreadyHaveAccount")}{" "}
            <Link
              href={`/auth/login${callbackUrl !== "/admin" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            >
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
