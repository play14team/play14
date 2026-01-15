"use server"

import { setAuthCookie } from "@/libs/auth"
import { strapiFetch } from "@/libs/strapi-client"
import { getFeatureFlags } from "@/libs/feature-flags"

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
 * Verify Turnstile token with Cloudflare
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.warn("Turnstile secret key not configured")
    return true // Allow registration if Turnstile is not configured
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    )

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error("Turnstile verification error:", error)
    return false
  }
}

/**
 * Register a new user with username, email, and password using Strapi local provider
 */
export async function registerWithCredentials(
  username: string,
  email: string,
  password: string,
  turnstileToken: string | null = null
): Promise<RegisterResult> {
  // Block registration if feature is disabled
  const flags = await getFeatureFlags()
  if (!flags.loginEnabled) {
    return { success: false, error: "Registration is currently unavailable" }
  }

  // Verify Turnstile token if provided
  if (turnstileToken) {
    const isValid = await verifyTurnstileToken(turnstileToken)
    if (!isValid) {
      return {
        success: false,
        error: "CAPTCHA verification failed. Please try again.",
      }
    }
  }

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
