"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registerWithCredentials } from "./register.action"
import Turnstile from "@/components/ui/turnstile"

interface RegisterFormProps {
  callbackUrl: string
}

export default function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const validateForm = (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ): boolean => {
    const errors: Record<string, string> = {}

    if (!username || username.length < 3) {
      errors.username = "Username must be at least 3 characters"
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
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
      setError("Please complete the CAPTCHA verification")
      return
    }

    startTransition(async () => {
      const result = await registerWithCredentials(
        username,
        email,
        password,
        turnstileToken
      )

      if (result.success) {
        // After registration, redirect to the callback URL
        // The user will be redirected to /auth/no-player if they don't have a player profile
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || "Registration failed")
      }
    })
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          placeholder="Choose a username"
          autoComplete="username"
          disabled={isPending}
        />
        {fieldErrors.username && (
          <span className="auth-field-error">{fieldErrors.username}</span>
        )}
      </div>

      <div className="auth-form-field">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email address"
          autoComplete="email"
          disabled={isPending}
        />
        {fieldErrors.email && (
          <span className="auth-field-error">{fieldErrors.email}</span>
        )}
      </div>

      <div className="auth-form-field">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Create a password"
          autoComplete="new-password"
          disabled={isPending}
        />
        {fieldErrors.password && (
          <span className="auth-field-error">{fieldErrors.password}</span>
        )}
      </div>

      <div className="auth-form-field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Confirm your password"
          autoComplete="new-password"
          disabled={isPending}
        />
        {fieldErrors.confirmPassword && (
          <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
        )}
      </div>

      {turnstileSiteKey && (
        <div className="auth-form-turnstile">
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={(token) => setTurnstileToken(token)}
            onError={() => {
              setTurnstileToken(null)
              setError("CAPTCHA verification failed. Please try again.")
            }}
            onExpire={() => {
              setTurnstileToken(null)
              setError("CAPTCHA expired. Please verify again.")
            }}
          />
        </div>
      )}

      <button
        type="submit"
        className="auth-login-btn auth-login-btn-submit"
        disabled={isPending}
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>
    </form>
  )
}
