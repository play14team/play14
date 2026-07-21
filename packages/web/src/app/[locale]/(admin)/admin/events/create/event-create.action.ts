"use server"

import { strapiFetch } from "@/libs/strapi-client"

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
  contactEmail: string
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
  const result = await strapiFetch<{ data: LocationOption[] }>(
    "/admin/events/locations",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return []
  return result.data.data || []
}

/**
 * Get available venues for the dropdown
 */
export async function getVenues(): Promise<VenueOption[]> {
  const result = await strapiFetch<{ data: VenueOption[] }>(
    "/admin/events/venues",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return []
  return result.data.data || []
}

/**
 * Create a new event with default schedule and tickets
 */
export async function createEvent(data: EventCreateData): Promise<CreateEventResult> {
  const result = await strapiFetch<{ data: CreateEventResult["event"] }>(
    "/admin/events/create",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create event",
    }
  }

  return {
    success: true,
    event: result.data?.data,
  }
}
