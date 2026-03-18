"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState, useTransition } from "react"
import { loginWithCredentials } from "@/components/auth/login.action"
import LoginButtons from "@/components/auth/login-buttons"
import styles from "./auth-gate.module.scss"

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"

interface AuthGateProps {
  callbackUrl: string
  onDismiss: () => void
}

export default function AuthGate({ callbackUrl, onDismiss }: AuthGateProps) {
  const t = useTranslations("tickets")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const googleUrl = `${STRAPI_URL}/api/connect/google`
  const microsoftUrl = `${STRAPI_URL}/api/connect/microsoft`
  const githubUrl = `${STRAPI_URL}/api/connect/github`
  const linkedinUrl = `${STRAPI_URL}/api/connect/linkedin`

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onDismiss])

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const identifier = formData.get("identifier") as string
    const password = formData.get("password") as string

    if (!identifier || !password) {
      setError(t("emailAndPasswordRequired"))
      return
    }

    startTransition(async () => {
      const result = await loginWithCredentials(identifier, password)

      if (result.success) {
        onDismiss()
        router.refresh()
      } else {
        setError(result.error || t("loginFailed"))
      }
    })
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onDismiss()
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <button type="button" className={styles.closeButton} onClick={onDismiss} aria-label="Close">
          ×
        </button>

        <div className={styles.content}>
          <h2>{t("signInTitle")}</h2>
          <p className={styles.subtitle}>{t("signInSubtitle")}</p>

          <div className={styles.benefits}>
            <h3>{t("whySignIn")}</h3>
            <ul>
              <li>{t("benefitProfile")}</li>
              <li>{t("benefitCheckIn")}</li>
              <li>{t("benefitAccess")}</li>
              <li>{t("benefitCommunity")}</li>
            </ul>
          </div>

          {/* Reuse LoginButtons component */}
          <LoginButtons
            googleUrl={googleUrl}
            microsoftUrl={microsoftUrl}
            githubUrl={githubUrl}
            linkedinUrl={linkedinUrl}
            callbackUrl={callbackUrl}
          />

          <div className={styles.divider}>
            <span>{t("orSignInWithEmail")}</span>
          </div>

          <form className="auth-login-form" onSubmit={handleEmailSubmit}>
            {error && <div className="auth-form-error">{error}</div>}

            <div className="auth-form-field">
              <input
                type="text"
                name="identifier"
                placeholder={t("emailOrUsername")}
                autoComplete="username"
                disabled={isPending}
              />
            </div>

            <div className="auth-form-field">
              <input
                type="password"
                name="password"
                placeholder={t("password")}
                autoComplete="current-password"
                disabled={isPending}
              />
            </div>

            <button
              type="submit"
              className="auth-login-btn auth-login-btn-submit"
              disabled={isPending}
            >
              {isPending ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <p className={styles.registerLink}>
            {t("noAccount")}{" "}
            <Link
              href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              onClick={() => {
                sessionStorage.setItem("auth_callback_url", callbackUrl)
              }}
            >
              {t("createOne")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
