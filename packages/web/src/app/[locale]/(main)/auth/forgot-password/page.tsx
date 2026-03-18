import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import ForgotPasswordForm from "@/components/auth/forgot-password-form"
import Logo from "@/components/layout/logo"
import { Link } from "@/i18n/navigation"
import { getAuthState } from "@/libs/auth"
import { getFeatureFlags } from "@/libs/feature-flags"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
}

export default async function ForgotPasswordPage() {
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    notFound()
  }

  const [{ isAuthenticated }, t] = await Promise.all([
    getAuthState(),
    getTranslations("auth.forgotPassword"),
  ])

  if (isAuthenticated) {
    redirect("/admin")
  }

  return (
    <div className="auth-login-page">
      <div className="auth-login-card" style={{ maxWidth: 440 }}>
        <div className="auth-login-header">
          <Logo width={120} height={40} />
          <h1>{t("heading")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        <ForgotPasswordForm />

        <p className="auth-register-link">
          <Link href="/auth/login">{t("backToSignIn")}</Link>
        </p>
      </div>
    </div>
  )
}
