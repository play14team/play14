"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { resetPasswordWithCode } from "./reset-password.action"

interface ResetPasswordFormProps {
  code: string | null
  callbackUrl: string
}

export default function ResetPasswordForm({ code, callbackUrl }: ResetPasswordFormProps) {
  const t = useTranslations("auth.form")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!code) {
      setError(t("missingResetLink"))
      return
    }

    const formData = new FormData(event.currentTarget)
    const password = formData.get("password") as string
    const passwordConfirmation = formData.get("passwordConfirmation") as string

    if (!password || password.length < 6) {
      setError(t("passwordMinLength"))
      return
    }

    if (password !== passwordConfirmation) {
      setError(t("passwordsNoMatch"))
      return
    }

    startTransition(async () => {
      const result = await resetPasswordWithCode(code, password, passwordConfirmation)

      if (result.success) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || t("resetFailed"))
      }
    })
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <label htmlFor="password">{t("newPassword")}</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder={t("createPassword")}
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>

      <div className="auth-form-field">
        <label htmlFor="passwordConfirmation">{t("confirmPassword")}</label>
        <input
          type="password"
          id="passwordConfirmation"
          name="passwordConfirmation"
          placeholder={t("confirmYourPassword")}
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>

      <button type="submit" className="auth-login-btn auth-login-btn-submit" disabled={isPending}>
        {isPending ? t("settingPassword") : t("setPassword")}
      </button>
    </form>
  )
}
