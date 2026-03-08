"use client"

import { useState, useTransition } from "react"
import { forgotPassword } from "./forgot-password.action"

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string

    if (!email) {
      setError("Please enter your email address")
      return
    }

    startTransition(async () => {
      const result = await forgotPassword(email)

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || "Something went wrong. Please try again.")
      }
    })
  }

  if (success) {
    return (
      <div className="auth-success-message">
        If an account exists with that email, we've sent a password reset link. Check your inbox.
      </div>
    )
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email address"
          autoComplete="email"
          disabled={isPending}
        />
      </div>

      <button type="submit" className="auth-login-btn auth-login-btn-submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  )
}
