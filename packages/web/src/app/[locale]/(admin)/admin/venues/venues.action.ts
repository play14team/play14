"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

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
    socialNetworkType: string
  }>
  eventsCount: number
  events: Array<{
    id: number
    name: string
    slug: string
  }>
}

const emptyResponse: VenuesListResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
}

/**
 * Get list of venues with optional search
 */
export async function getVenues(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<VenuesListResponse> {
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (search) {
    queryParams.search = search
  }

  const result = await strapiFetchWithQuery<VenuesListResponse>("/admin/venues", {}, queryParams, {
    cache: "no-store",
  })

  if (!result.ok) {
    console.error(`[Venues] Failed to fetch venues: ${result.status} - ${result.error}`)
    return emptyResponse
  }

  return result.data || emptyResponse
}

/**
 * Get a venue for editing
 */
export async function getVenueForEdit(venueId: string): Promise<VenueForEdit | null> {
  const result = await strapiFetch<{ data: VenueForEdit }>(
    "/admin/venues/:venueId",
    { venueId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data
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
  const result = await strapiFetch<{ data: { documentId: string } }>(
    "/admin/venues",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create venue",
    }
  }

  return { success: true, documentId: result.data?.data.documentId }
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
  const result = await strapiFetch(
    "/admin/venues/:venueId",
    { venueId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update venue",
    }
  }

  return { success: true }
}

/**
 * Delete a venue
 */
export async function deleteVenue(venueId: string): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch("/admin/venues/:venueId", { venueId }, { method: "DELETE" })

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete venue",
    }
  }

  return { success: true }
}
