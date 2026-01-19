"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

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

const emptyResponse: LocationsListResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
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
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (search) {
    queryParams.search = search
  }
  if (country) {
    queryParams.country = country
  }

  const result = await strapiFetchWithQuery<LocationsListResponse>(
    "/admin/event-locations",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error(`[Locations] Failed to fetch locations: ${result.status} - ${result.error}`)
    return emptyResponse
  }

  return result.data || emptyResponse
}

/**
 * Get a location for editing
 */
export async function getLocationForEdit(locationId: string): Promise<LocationForEdit | null> {
  const result = await strapiFetch<{ data: LocationForEdit }>(
    "/admin/event-locations/:locationId",
    { locationId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data
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
  const result = await strapiFetch<{ data: { documentId: string } }>(
    "/admin/event-locations",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create location",
    }
  }

  return { success: true, documentId: result.data?.data.documentId }
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
  const result = await strapiFetch(
    "/admin/event-locations/:locationId",
    { locationId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update location",
    }
  }

  return { success: true }
}

/**
 * Delete an event location
 */
export async function deleteLocation(
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/event-locations/:locationId",
    { locationId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete location",
    }
  }

  return { success: true }
}
