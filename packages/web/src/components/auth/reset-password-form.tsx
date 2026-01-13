"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { resetPasswordWithCode } from "./reset-password.action"

interface ResetPasswordFormProps {
  code: string | null
  callbackUrl: string
}

export default function ResetPasswordForm({
  code,
  callbackUrl,
}: ResetPasswordFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!code) {
      setError("Missing reset link. Please use the invite email.")
      return
    }

    const formData = new FormData(event.currentTarget)
    const password = formData.get("password") as string
    const passwordConfirmation = formData.get("passwordConfirmation") as string

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match")
      return
    }

    startTransition(async () => {
      const result = await resetPasswordWithCode(code, password, passwordConfirmation)

      if (result.success) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || "Reset failed")
      }
    })
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <label htmlFor="password">New Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Create a password"
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>

      <div className="auth-form-field">
        <label htmlFor="passwordConfirmation">Confirm Password</label>
        <input
          type="password"
          id="passwordConfirmation"
          name="passwordConfirmation"
          placeholder="Confirm your password"
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>

      <button
        type="submit"
        className="auth-login-btn auth-login-btn-submit"
        disabled={isPending}
      >
        {isPending ? "Setting password..." : "Set password"}
      </button>
    </form>
  )
}
