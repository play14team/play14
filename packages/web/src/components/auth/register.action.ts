"use server"

import { setAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

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

interface StrapiErrorResponse {
  error: {
    status: number
    name: string
    message: string
    details?: {
      errors?: Array<{
        path: string[]
        message: string
        name: string
      }>
    }
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
  try {
    const response = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    })

    if (!response.ok) {
      const errorData: StrapiErrorResponse = await response.json()
      const errorMessage = errorData.error?.message || "Registration failed"

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

      // Check for detailed validation errors
      if (errorData.error?.details?.errors) {
        const firstError = errorData.error.details.errors[0]
        if (firstError) {
          return { success: false, error: firstError.message }
        }
      }

      return { success: false, error: errorMessage }
    }

    const data: StrapiAuthResponse = await response.json()

    // Store the JWT in an httpOnly cookie
    await setAuthCookie(data.jwt)

    return { success: true }
  } catch (error) {
    console.error("[Auth] Registration error:", error)
    return {
      success: false,
      error: "An error occurred during registration. Please try again.",
    }
  }
}
