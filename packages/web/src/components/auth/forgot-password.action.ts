"use server"

import { getFeatureFlags } from "@/libs/feature-flags"
import { strapiFetch } from "@/libs/strapi-client"

interface ForgotPasswordResult {
  success: boolean
  error?: string
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    return { success: false, error: "Password reset is currently unavailable" }
  }

  const result = await strapiFetch(
    "/auth/forgot-password",
    {},
    {
      method: "POST",
      body: { email },
      noAuth: true,
    }
  )

  if (!result.ok) {
    const errorMessage = result.error || "Request failed"
    const normalized = errorMessage.toLowerCase()

    if (normalized.includes("email") && normalized.includes("valid")) {
      return { success: false, error: "Please enter a valid email address" }
    }

    if (normalized.includes("email") && normalized.includes("required")) {
      return { success: false, error: "Please enter your email address" }
    }

    // For security, don't reveal whether the email exists.
    // Strapi may return an error for unknown emails, but we treat it as success.
    return { success: true }
  }

  return { success: true }
}
