"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface LocationListItem {
  documentId: string
  name: string
  slug: string
  country: string
  eventsCount: number
}

export interface LocationsListResponse {
  data: LocationListItem[]
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

export interface LocationForEdit {
  documentId: string
  name: string
  slug: string
  country: string
  location: MapLocation | null
  eventsCount: number
  events: Array<{
    id: number
    name: string
    slug: string
  }>
}

/**
 * Get list of event locations with optional search and country filter
 */
export async function getLocations(
  page = 1,
  pageSize = 25,
  search?: string,
  country?: string
): Promise<LocationsListResponse> {
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
    if (country) {
      params.append("country", country)
    }

    const response = await fetch(
      `${STRAPI_URL}/api/event-locations/admin?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Locations] Failed to fetch locations: ${response.status} - ${errorText}`)
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
 * Get a location for editing
 */
export async function getLocationForEdit(
  locationId: string
): Promise<LocationForEdit | null> {
  const jwt = await getAuthCookie()
  if (!jwt) return null

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/event-locations/admin/${locationId}`,
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

export interface LocationCreateData {
  name: string
  country: string
  location?: MapLocation | null
}

/**
 * Create a new event location
 */
export async function createLocation(
  data: LocationCreateData
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(`${STRAPI_URL}/api/event-locations/admin`, {
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
        error: errorData.error?.message || "Failed to create location",
      }
    }

    const result = await response.json()
    return { success: true, documentId: result.data.documentId }
  } catch {
    return { success: false, error: "Failed to create location" }
  }
}

export interface LocationUpdateData {
  name?: string
  country?: string
  location?: MapLocation | null
}

/**
 * Update an event location
 */
export async function updateLocation(
  locationId: string,
  data: LocationUpdateData
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/event-locations/admin/${locationId}`,
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
        error: errorData.error?.message || "Failed to update location",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to update location" }
  }
}

/**
 * Delete an event location
 */
export async function deleteLocation(
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/event-locations/admin/${locationId}`,
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
        error: errorData.error?.message || "Failed to delete location",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete location" }
  }
}
