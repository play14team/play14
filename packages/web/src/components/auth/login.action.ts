"use server"

import { setAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

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

interface StrapiErrorResponse {
  error: {
    status: number
    name: string
    message: string
  }
}

/**
 * Authenticate user with email/username and password using Strapi local provider
 */
export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        password,
      }),
    })

    if (!response.ok) {
      const errorData: StrapiErrorResponse = await response.json()
      const errorMessage = errorData.error?.message || "Invalid credentials"

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

    const data: StrapiAuthResponse = await response.json()

    // Store the JWT in an httpOnly cookie
    await setAuthCookie(data.jwt)

    return { success: true }
  } catch (error) {
    console.error("[Auth] Login error:", error)
    return {
      success: false,
      error: "An error occurred during login. Please try again.",
    }
  }
}
