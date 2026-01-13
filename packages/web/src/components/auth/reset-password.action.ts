"use server"

import { setAuthCookie } from "@/libs/auth"
import { strapiFetch } from "@/libs/strapi-client"

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

export async function resetPasswordWithCode(
  code: string,
  password: string,
  passwordConfirmation: string
): Promise<ResetPasswordResult> {
  const result = await strapiFetch<StrapiAuthResponse>(
    "/auth/reset-password",
    {},
    {
      method: "POST",
      body: { code, password, passwordConfirmation },
      noAuth: true,
    }
  )

  if (!result.ok) {
    const errorMessage = result.error || "Reset failed"
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

  if (!result.data?.jwt) {
    return { success: false, error: "Reset failed - no token received" }
  }

  await setAuthCookie(result.data.jwt)

  return { success: true }
}
