"use server"

import { setAuthCookie } from "@/libs/auth"
import { strapiFetch } from "@/libs/strapi-client"
import { featureFlags } from "@/libs/feature-flags"

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
 * Verify Turnstile token with Cloudflare
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.warn("Turnstile secret key not configured")
    return true // Allow login if Turnstile is not configured
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
 * Authenticate user with email/username and password using Strapi local provider
 */
export async function loginWithCredentials(
  identifier: string,
  password: string,
  turnstileToken: string | null = null
): Promise<LoginResult> {
  // Block login if feature is disabled
  if (!featureFlags.loginEnabled) {
    return { success: false, error: "Login is currently unavailable" }
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
