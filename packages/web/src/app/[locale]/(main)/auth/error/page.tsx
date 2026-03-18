import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Logo from "@/components/layout/logo"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.error")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
}

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>
}

const errorCodeMap: Record<string, string> = {
  no_token: "noToken",
  session_expired: "sessionExpired",
  no_player: "noPlayer",
  access_denied: "accessDenied",
  email_taken: "emailTaken",
  token_exchange_failed: "tokenExchangeFailed",
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams
  const t = await getTranslations("auth.error")
  const errorCode = params.error || "default"
  const translationKey = errorCodeMap[errorCode] || "default"

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
          <h1>{t(`${translationKey}.title`)}</h1>
          <p>{t(`${translationKey}.message`)}</p>
        </div>

        <div className="auth-error-actions">
          <Link href="/auth/login" className="btn btn-primary">
            {t("tryAgain")}
          </Link>
          <Link href="/" className="btn btn-outline">
            {t("goHome")}
          </Link>
        </div>

        {errorCode === "no_player" && (
          <div className="auth-error-contact">
            <p>
              {t("needHelp")} <Link href="/contact">{t("contactCommunity")}</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
