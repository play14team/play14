"use server"

import { strapiFetch } from "@/libs/strapi-client"

interface SubscribeResult {
  success: boolean
  error?: string
}

interface SubscribeResponse {
  data: {
    success: boolean
    message: string
  }
}

/**
 * Subscribe to the newsletter via Strapi API
 *
 * @param email - Email address to subscribe
 * @param firstName - Optional first name
 * @param source - Source indicator (e.g., "footer", "profile")
 * @returns Result with success status or error message
 */
export async function subscribeToNewsletter(
  email: string,
  firstName?: string,
  source?: string
): Promise<SubscribeResult> {
  // Basic client-side validation
  if (!email || typeof email !== "string") {
    return { success: false, error: "Email is required" }
  }

  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return { success: false, error: "Email is required" }
  }

  // Simple email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: "Please enter a valid email address" }
  }

  const result = await strapiFetch<SubscribeResponse>(
    "/newsletter/subscribe",
    {},
    {
      method: "POST",
      body: {
        email: trimmedEmail,
        firstName: firstName?.trim() || undefined,
        source: source || undefined,
      },
      noAuth: true,
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to subscribe. Please try again.",
    }
  }

  return { success: true }
}
