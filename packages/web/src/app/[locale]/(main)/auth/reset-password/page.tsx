import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import ResetPasswordForm from "@/components/auth/reset-password-form"
import Logo from "@/components/layout/logo"
import { Link } from "@/i18n/navigation"
import { getAuthState } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
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
  const [{ isAuthenticated }, t] = await Promise.all([
    getAuthState(),
    getTranslations("auth.resetPassword"),
  ])

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
          <h1>{t("heading")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        {!code && <div className="auth-error-message">{t("missingLink")}</div>}

        <ResetPasswordForm code={code} callbackUrl={callbackUrl} />

        <p className="auth-register-link">
          {t("alreadyHavePassword")} <Link href={loginLink}>{t("signIn")}</Link>
        </p>
      </div>
    </div>
  )
}
