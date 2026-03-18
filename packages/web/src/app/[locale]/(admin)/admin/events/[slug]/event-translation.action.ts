"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_API_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

/**
 * Fetch the event description for a specific locale via custom endpoint.
 * Uses the Document Service directly to get locale-specific content.
 */
export async function getEventLocaleDescription(eventSlug: string, locale: string) {
  const token = await getAuthCookie()

  if (!token) {
    return { success: false, description: "" }
  }

  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/admin/events/${eventSlug}/translation?locale=${locale}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error("Failed to fetch locale description:", response.status, response.statusText)
      return { success: false, description: "" }
    }

    const data = await response.json()
    return { success: true, description: (data.data?.description as string) || "" }
  } catch (error) {
    console.error("Error fetching locale description:", error)
    return { success: false, description: "" }
  }
}

/**
 * Update or create a localization for an event via custom endpoint.
 * Uses the Document Service directly to create/update locale entries.
 */
export async function updateEventLocalization(
  eventSlug: string,
  locale: string,
  description: string
) {
  const token = await getAuthCookie()

  if (!token) {
    return { success: false, error: "Not authenticated" as const }
  }

  try {
    const response = await fetch(`${STRAPI_API_URL}/api/admin/events/${eventSlug}/translation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          locale,
          description,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Update localization error:", errorData)
      return { success: false, error: "Failed to save translation" as const }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating localization:", error)
    return { success: false, error: "Failed to save translation" as const }
  }
}

/**
 * Translate description using Gemini
 */
export async function translateWithGemini(
  text: string,
  sourceLocale: string,
  targetLocale: string
) {
  const token = await getAuthCookie()

  if (!token) {
    return { success: false, error: "Not authenticated" as const }
  }

  try {
    const response = await fetch(`${STRAPI_API_URL}/api/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        sourceLocale,
        targetLocale,
        format: "html",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Translation error:", errorData)
      return { success: false, error: "Translation failed" as const }
    }

    const data = await response.json()
    return { success: true, translation: data.translation as string }
  } catch (error) {
    console.error("Error translating:", error)
    return { success: false, error: "Translation failed" as const }
  }
}
