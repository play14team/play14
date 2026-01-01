"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// Types for event editing
export interface EventForEdit {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  timezone?: string
  eventStatus: string
  tagline?: string
  description?: string
  contactEmail?: string
  location?: {
    documentId: string
    name: string
    country: string
  }
  venue?: {
    documentId: string
    name: string
    addressDetails?: string
  }
  hosts?: {
    documentId: string
    name: string
  }[]
  mentors?: {
    documentId: string
    name: string
  }[]
  timetable?: {
    day: string
    description: string
    timeslots: {
      time: string
      description: string
    }[]
  }[]
  ticketTypes?: {
    documentId: string
    name: string
    description?: string
    price: number
    currency: string
    capacity?: number | null
    soldCount: number
    validFrom?: string | null
    validUntil?: string | null
    sortOrder: number
    isActive: boolean
  }[]
  ticketingEnabled?: boolean
  paymentProvider?: string
  stripeAccount?: {
    documentId: string
    stripeAccountId: string
    accountStatus: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
  }
}

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

export interface OrganizerOption {
  documentId: string
  name: string
  position: string
}

export interface EventUpdateData {
  name?: string
  start?: string
  end?: string
  timezone?: string
  eventStatus?: string
  tagline?: string
  description?: string
  contactEmail?: string
  locationId?: string
  venueId?: string
  newLocation?: { name: string; country: string }
  newVenue?: { name: string; addressDetails?: string }
  hostIds?: string[]
  mentorIds?: string[]
}

export interface UpdateEventResult {
  success: boolean
  event?: {
    documentId: string
    slug: string
    name: string
  }
  error?: string
}

/**
 * Get event data for editing
 */
export async function getEventForEdit(
  slug: string
): Promise<EventForEdit | null> {
  const jwt = await getAuthCookie()
  if (!jwt) return null

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${slug}/edit`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.data || null
  } catch {
    return null
  }
}

/**
 * Update event data
 */
export async function updateEvent(
  slug: string,
  data: EventUpdateData
): Promise<UpdateEventResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${slug}/edit`, {
      method: "PUT",
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
          `Failed to update event (${response.status})`,
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
 * Get available organizers (hosts, mentors, founders) for the dropdown
 */
export async function getOrganizers(): Promise<OrganizerOption[]> {
  const jwt = await getAuthCookie()
  if (!jwt) {
    console.log("[getOrganizers] No JWT token")
    return []
  }

  try {
    const url = `${STRAPI_URL}/api/events/organizers`
    console.log("[getOrganizers] Fetching from:", url)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    })

    console.log("[getOrganizers] Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[getOrganizers] Error response:", errorText)
      return []
    }

    const data = await response.json()
    console.log("[getOrganizers] Got data:", JSON.stringify(data))
    return data.data || []
  } catch (error) {
    console.log("[getOrganizers] Exception:", error)
    return []
  }
}
