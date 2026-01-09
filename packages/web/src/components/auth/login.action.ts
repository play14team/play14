"use server"

import { setAuthCookie } from "@/libs/auth"
import { strapiFetch } from "@/libs/strapi-client"

interface LoginResult {
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

/**
 * Authenticate user with email/username and password using Strapi local provider
 */
export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<LoginResult> {
  const result = await strapiFetch<StrapiAuthResponse>(
    "/auth/local",
    {},
    {
      method: "POST",
      body: { identifier, password },
      noAuth: true,
    }
  )

  if (!result.ok) {
    const errorMessage = result.error || "Invalid credentials"

    // Map Strapi error messages to user-friendly messages
    if (
      errorMessage.includes("Invalid identifier or password") ||
      errorMessage.includes("invalid")
    ) {
      return { success: false, error: "Invalid email/username or password" }
    }

    if (errorMessage.includes("blocked")) {
      return { success: false, error: "Your account has been blocked" }
    }

    if (errorMessage.includes("confirmed")) {
      return {
        success: false,
        error: "Please confirm your email address before logging in",
      }
    }

    return { success: false, error: errorMessage }
  }

  if (!result.data?.jwt) {
    return { success: false, error: "Login failed - no token received" }
  }

  // Store the JWT in an httpOnly cookie
  await setAuthCookie(result.data.jwt)

  return { success: true }
}
