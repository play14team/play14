"use server"

import { setAuthCookie } from "@/libs/auth"

interface ResetPasswordResult {
  success: boolean
  error?: string
}

interface StrapiAuthResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
    provider: string
    confirmed: boolean
    blocked: boolean
  }
}

interface StrapiErrorResponse {
  error?: { message?: string }
}

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// Reset-password isn't safely retryable (the code can be single-use) so we
// only get one shot. @strapi/client's default 10s timeout was too tight under
// slow-API conditions and surfaced as "This operation was aborted" — bypass it
// and use a direct fetch with a generous 30s window, matching the tryFetch
// timeout used elsewhere in strapi-client.ts.
const RESET_PASSWORD_TIMEOUT_MS = 30_000

export async function resetPasswordWithCode(
  code: string,
  password: string,
  passwordConfirmation: string
): Promise<ResetPasswordResult> {
  let response: Response
  try {
    response = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, password, passwordConfirmation }),
      signal: AbortSignal.timeout(RESET_PASSWORD_TIMEOUT_MS),
      cache: "no-store",
    })
  } catch (error) {
    console.error("[ResetPassword] Request failed:", error)
    return { success: false, error: "Reset failed. Please try again." }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as StrapiErrorResponse
    const errorMessage = body?.error?.message || `Reset failed (${response.status})`
    const normalizedMessage = errorMessage.toLowerCase()

    if (
      normalizedMessage.includes("incorrect code") ||
      normalizedMessage.includes("invalid code") ||
      normalizedMessage.includes("reset password code") ||
      normalizedMessage.includes("reset password token") ||
      (normalizedMessage.includes("reset") && normalizedMessage.includes("token")) ||
      (normalizedMessage.includes("reset") && normalizedMessage.includes("code")) ||
      normalizedMessage.includes("invalid reset password")
    ) {
      return { success: false, error: "Invalid or expired reset link" }
    }

    if (
      normalizedMessage.includes("passwords do not match") ||
      normalizedMessage.includes("password confirmation") ||
      normalizedMessage.includes("password confirmation does not match")
    ) {
      return { success: false, error: "Passwords do not match" }
    }

    if (
      normalizedMessage.includes("password") &&
      (normalizedMessage.includes("at least") ||
        normalizedMessage.includes("min") ||
        normalizedMessage.includes("short") ||
        normalizedMessage.includes("characters") ||
        normalizedMessage.includes("length"))
    ) {
      return { success: false, error: "Password must be at least 6 characters" }
    }

    return { success: false, error: errorMessage }
  }

  const data = (await response.json().catch(() => null)) as StrapiAuthResponse | null
  if (!data?.jwt) {
    return { success: false, error: "Reset failed - no token received" }
  }

  await setAuthCookie(data.jwt)

  return { success: true }
}
