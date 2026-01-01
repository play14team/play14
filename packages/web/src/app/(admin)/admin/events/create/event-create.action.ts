"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// Types
export interface LocationOption {
  documentId: string
  name: string
  country: string
}

export interface VenueOption {
  documentId: string
  name: string
  addressDetails?: string
}

export interface EventCreateData {
  name: string
  start: string
  end: string
  locationId?: string
  newLocation?: { name: string; country: string }
  venueId?: string
  newVenue?: { name: string; addressDetails?: string }
  description?: string
  timezone?: string
}

export interface CreateEventResult {
  success: boolean
  event?: {
    documentId: string
    slug: string
    name: string
    start: string
    end: string
  }
  error?: string
}

/**
 * Get available event locations for the dropdown
 */
export async function getLocations(): Promise<LocationOption[]> {
  const jwt = await getAuthCookie()
  if (!jwt) return []

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/locations`, {
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

/**
 * Get available venues for the dropdown
 */
export async function getVenues(): Promise<VenueOption[]> {
  const jwt = await getAuthCookie()
  if (!jwt) return []

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/venues`, {
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

/**
 * Create a new event with default schedule and tickets
 */
export async function createEvent(
  data: EventCreateData
): Promise<CreateEventResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error:
          errorData.error?.message ||
          `Failed to create event (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      event: responseData.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
