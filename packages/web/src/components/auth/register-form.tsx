"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import Turnstile from "@/components/ui/turnstile"
import { registerWithCredentials } from "./register.action"

interface RegisterFormProps {
  callbackUrl: string
}

export default function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const t = useTranslations("auth.form")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true)

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const validateForm = (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ): boolean => {
    const errors: Record<string, string> = {}

    if (!username || username.length < 3) {
      errors.username = t("usernameMinLength")
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t("invalidEmail")
    }

    if (!password || password.length < 6) {
      errors.password = t("passwordMinLength")
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = t("passwordsNoMatch")
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!validateForm(username, email, password, confirmPassword)) {
      return
    }

    // Check Turnstile verification if enabled
    if (turnstileSiteKey && !turnstileToken) {
      setError(t("completeCaptcha"))
      return
    }

    startTransition(async () => {
      const result = await registerWithCredentials(
        username,
        email,
        password,
        turnstileToken,
        subscribeNewsletter
      )

      if (result.success) {
        // After registration, redirect to the callback URL
        // The user will be redirected to /auth/no-player if they don't have a player profile
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || t("registrationFailed"))
      }
    })
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <label htmlFor="username">{t("username")}</label>
        <input
          type="text"
          id="username"
          name="username"
          placeholder={t("chooseUsername")}
          autoComplete="username"
          disabled={isPending}
        />
        {fieldErrors.username && <span className="auth-field-error">{fieldErrors.username}</span>}
      </div>

      <div className="auth-form-field">
        <label htmlFor="email">{t("email")}</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder={t("enterEmail")}
          autoComplete="email"
          disabled={isPending}
        />
        {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
      </div>

      <div className="auth-form-field">
        <label htmlFor="password">{t("password")}</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder={t("createPassword")}
          autoComplete="new-password"
          disabled={isPending}
        />
        {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
      </div>

      <div className="auth-form-field">
        <label htmlFor="confirmPassword">{t("confirmPassword")}</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          placeholder={t("confirmYourPassword")}
          autoComplete="new-password"
          disabled={isPending}
        />
        {fieldErrors.confirmPassword && (
          <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
        )}
      </div>

      <div className="auth-form-field auth-form-checkbox">
        <label>
          <input
            type="checkbox"
            checked={subscribeNewsletter}
            onChange={(e) => setSubscribeNewsletter(e.target.checked)}
            disabled={isPending}
          />
          <span>{t("subscribeNewsletter")}</span>
        </label>
      </div>

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

      <button type="submit" className="auth-login-btn auth-login-btn-submit" disabled={isPending}>
        {isPending ? t("creatingAccount") : t("createAccount")}
      </button>
    </form>
  )
}
