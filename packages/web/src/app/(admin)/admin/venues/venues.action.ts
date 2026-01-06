"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface VenueListItem {
  documentId: string
  name: string
  addressDetails: string | null
  website: string | null
  logo: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  } | null
  eventsCount: number
}

export interface VenuesListResponse {
  data: VenueListItem[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface MapLocation {
  geometry?: {
    coordinates?: [number, number]
    type?: string
  }
  place_name?: string
}

export interface VenueForEdit {
  documentId: string
  name: string
  website: string | null
  addressDetails: string | null
  location: MapLocation | null
  logo: {
    id: number
    name?: string
    url: string
    formats?: {
      thumbnail?: { url: string; width: number; height: number }
      small?: { url: string; width: number; height: number }
      medium?: { url: string; width: number; height: number }
      large?: { url: string; width: number; height: number }
    }
  } | null
  socialNetworks: Array<{
    id: number
    url: string
    type: string
  }>
  eventsCount: number
  events: Array<{
    id: number
    name: string
    slug: string
  }>
}

/**
 * Get list of venues with optional search
 */
export async function getVenues(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<VenuesListResponse> {
  const jwt = await getAuthCookie()
  if (!jwt) {
    return {
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    }
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    if (search) {
      params.append("search", search)
    }

    const response = await fetch(
      `${STRAPI_URL}/api/venues/admin?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Venues] Failed to fetch venues: ${response.status} - ${errorText}`)
      return {
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
      }
    }

    const data = await response.json()
    return data
  } catch {
    return {
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    }
  }
}

/**
 * Get a venue for editing
 */
export async function getVenueForEdit(
  venueId: string
): Promise<VenueForEdit | null> {
  const jwt = await getAuthCookie()
  if (!jwt) return null

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/venues/admin/${venueId}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: "no-store",
      }
    )

    if (!response.ok) return null
    const data = await response.json()
    return data.data
  } catch {
    return null
  }
}

export interface VenueCreateData {
  name: string
  website?: string
  addressDetails?: string
  location?: MapLocation | null
}

/**
 * Create a new venue
 */
export async function createVenue(
  data: VenueCreateData
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(`${STRAPI_URL}/api/venues/admin`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to create venue",
      }
    }

    const result = await response.json()
    return { success: true, documentId: result.data.documentId }
  } catch {
    return { success: false, error: "Failed to create venue" }
  }
}

export interface VenueUpdateData {
  name?: string
  website?: string
  addressDetails?: string
  location?: MapLocation | null
}

/**
 * Update a venue
 */
export async function updateVenue(
  venueId: string,
  data: VenueUpdateData
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/venues/admin/${venueId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to update venue",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to update venue" }
  }
}

/**
 * Delete a venue
 */
export async function deleteVenue(
  venueId: string
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/venues/admin/${venueId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to delete venue",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete venue" }
  }
}
