"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import Turnstile from "@/components/ui/turnstile"
import { loginWithCredentials } from "./login.action"

interface LoginFormProps {
  callbackUrl: string
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const t = useTranslations("auth.form")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const identifier = formData.get("identifier") as string
    const password = formData.get("password") as string

    if (!identifier || !password) {
      setError(t("enterCredentials"))
      return
    }

    // Check Turnstile verification if enabled
    if (turnstileSiteKey && !turnstileToken) {
      setError(t("completeCaptcha"))
      return
    }

    startTransition(async () => {
      const result = await loginWithCredentials(identifier, password, turnstileToken)

      if (result.success) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || t("signInFailed"))
      }
    })
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <input
          type="text"
          id="identifier"
          name="identifier"
          placeholder={t("emailOrUsername")}
          autoComplete="username"
          disabled={isPending}
        />
      </div>

      <div className="auth-form-field">
        <input
          type="password"
          id="password"
          name="password"
          placeholder={t("password")}
          autoComplete="current-password"
          disabled={isPending}
        />
      </div>

      <button type="submit" className="auth-login-btn auth-login-btn-submit" disabled={isPending}>
        {isPending ? t("signingIn") : t("signIn")}
      </button>

      {turnstileSiteKey && (
        <div className="auth-form-turnstile">
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={(token) => setTurnstileToken(token)}
            onError={() => {
              setTurnstileToken(null)
              setError(t("captchaFailed"))
            }}
            onExpire={() => {
              setTurnstileToken(null)
              setError(t("captchaExpired"))
            }}
          />
        </div>
      )}
    </form>
  )
}
