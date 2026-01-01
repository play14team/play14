"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { loginWithCredentials } from "./login.action"

interface LoginFormProps {
  callbackUrl: string
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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

    startTransition(async () => {
      const result = await loginWithCredentials(identifier, password)

      if (result.success) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(result.error || "Login failed")
      }
    })
  }

  return (
    <form className="auth-login-form" onSubmit={handleSubmit}>
      {error && <div className="auth-form-error">{error}</div>}

      <div className="auth-form-field">
        <label htmlFor="identifier">Email or Username</label>
        <input
          type="text"
          id="identifier"
          name="identifier"
          placeholder="Enter your email or username"
          autoComplete="username"
          disabled={isPending}
        />
      </div>

      <div className="auth-form-field">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isPending}
        />
      </div>

      <button
        type="submit"
        className="auth-login-btn auth-login-btn-submit"
        disabled={isPending}
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
