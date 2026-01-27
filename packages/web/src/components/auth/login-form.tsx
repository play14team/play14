"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Turnstile from "@/components/ui/turnstile"
import { loginWithCredentials } from "./login.action"

interface LoginFormProps {
  callbackUrl: string
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
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
      setError("Please enter your email/username and password")
      return
    }

    // Check Turnstile verification if enabled
    if (turnstileSiteKey && !turnstileToken) {
      setError("Please complete the CAPTCHA verification")
      return
    }

    startTransition(async () => {
      const result = await loginWithCredentials(identifier, password, turnstileToken)

      if (result.success) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || "Unable to sign in. Please check your credentials and try again.")
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
          placeholder="Email or username"
          autoComplete="username"
          disabled={isPending}
        />
      </div>

      <div className="auth-form-field">
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          disabled={isPending}
        />
      </div>

      <button type="submit" className="auth-login-btn auth-login-btn-submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>

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
    </form>
  )
}
