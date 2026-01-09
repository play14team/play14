"use server"

import { setAuthCookie } from "@/libs/auth"
import { strapiFetch } from "@/libs/strapi-client"

interface RegisterResult {
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
 * Register a new user with username, email, and password using Strapi local provider
 */
export async function registerWithCredentials(
  username: string,
  email: string,
  password: string
): Promise<RegisterResult> {
  const result = await strapiFetch<StrapiAuthResponse>(
    "/auth/local/register",
    {},
    {
      method: "POST",
      body: { username, email, password },
      noAuth: true,
    }
  )

  if (!result.ok) {
    const errorMessage = result.error || "Registration failed"

    // Map Strapi error messages to user-friendly messages
    if (
      errorMessage.includes("Email or Username are already taken") ||
      errorMessage.includes("already taken")
    ) {
      return {
        success: false,
        error: "This email or username is already registered",
      }
    }

    if (errorMessage.includes("email")) {
      return { success: false, error: "Please enter a valid email address" }
    }

    if (errorMessage.includes("password")) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      }
    }

    if (errorMessage.includes("username")) {
      return {
        success: false,
        error: "Username must be at least 3 characters",
      }
    }

    return { success: false, error: errorMessage }
  }

  if (!result.data?.jwt) {
    return { success: false, error: "Registration failed - no token received" }
  }

  // Store the JWT in an httpOnly cookie
  await setAuthCookie(result.data.jwt)

  return { success: true }
}
