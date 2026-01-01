"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface MyEvent {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  eventStatus: string
  isPublished: boolean
  location: {
    name: string
    country: string
  } | null
}

/**
 * Get events for the current organizer
 * - Hosts see events they host
 * - Mentors see events they mentor
 * - Founders see all events
 */
export async function getMyEvents(): Promise<MyEvent[]> {
  const jwt = await getAuthCookie()
  if (!jwt) return []

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/my-events`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    })

    if (!response.ok) return []
    const data = await response.json()
    return data.data || []
  } catch {
    return []
  }
}
