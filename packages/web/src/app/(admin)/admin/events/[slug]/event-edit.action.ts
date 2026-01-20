"use server"

import { strapiFetch } from "@/libs/strapi-client"
import { revalidatePath } from "next/cache"
import type { FinanceData } from "./finance.action"
import type { MediaLink } from "./media-links.action"
import type { TimetableDay } from "./schedule.types"

/**
 * Revalidate all public pages that display event data
 */
export async function revalidateEventPages(slug: string) {
  // Revalidate the specific event page
  revalidatePath(`/events/${slug}`)

  // Revalidate event listing pages
  revalidatePath("/events")
  revalidatePath("/events/map")
  revalidatePath("/events/calendar")

  // Revalidate home page (may show upcoming events)
  revalidatePath("/")
}

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
  isPublished?: boolean
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
    id?: number
    day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"
    description: string
    timeslots: {
      id?: number
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
  ticketingMode?: "none" | "internal" | "external"
  stripeAccount?: {
    documentId: string
    stripeAccountId: string
    accountStatus: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    defaultCurrency?: string
  }
  registration?: {
    link?: string
    widgetCode?: string
  }
  finance?: {
    id?: number
    revenue: number
    expenses: number
    destination: string
    result: "Profit" | "Loss"
    resultAmount: number
  }
  media?: {
    id?: number
    url: string
    type: "Photos" | "Videos"
  }[]
  defaultImage?: {
    id: number
    documentId?: string
    name: string
    url: string
    width?: number
    height?: number
    formats?: {
      thumbnail?: { url: string; width: number; height: number }
      small?: { url: string; width: number; height: number }
      medium?: { url: string; width: number; height: number }
      large?: { url: string; width: number; height: number }
    }
  } | null
  images?: {
    id: number
    documentId?: string
    name: string
    url: string
    width?: number
    height?: number
    formats?: {
      thumbnail?: { url: string; width: number; height: number }
      small?: { url: string; width: number; height: number }
      medium?: { url: string; width: number; height: number }
      large?: { url: string; width: number; height: number }
    }
  }[]
  sponsorships?: {
    id?: number
    category: string
    sponsors: {
      documentId: string
      name: string
      url?: string
      logo?: {
        id: number
        url: string
        width?: number
        height?: number
        formats?: {
          thumbnail?: { url: string; width: number; height: number }
          small?: { url: string; width: number; height: number }
        }
      } | null
    }[]
  }[]
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
  avatar?: {
    url: string
  } | null
}

export type TicketingMode = "internal" | "external" | "none"

// Sponsorship format for API submission (sponsor documentIds only)
export interface SponsorshipUpdateData {
  id?: number
  category: string
  sponsors: string[] // Array of sponsor documentIds
}

export interface EventUpdateData {
  name?: string
  start?: string
  end?: string
  timezone?: string
  eventStatus?: string
  tagline?: string | null
  description?: string | null
  contactEmail?: string | null
  locationId?: string
  venueId?: string
  newLocation?: {
    name: string
    country: string
    location?: {
      geometry?: { coordinates?: [number, number]; type?: string }
      place_name?: string
    }
  }
  newVenue?: { name: string; addressDetails?: string }
  hostIds?: string[]
  mentorIds?: string[]
  // Ticketing
  ticketingMode?: TicketingMode
  registration?: {
    link?: string
    widgetCode?: string
  }
  // Sponsorships
  sponsorships?: SponsorshipUpdateData[]
  // Schedule (timetable)
  schedule?: TimetableDay[]
  // Media links
  mediaLinks?: MediaLink[]
  // Finance data
  finance?: FinanceData
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

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Get event data for editing
 */
export async function getEventForEdit(slug: string): Promise<EventForEdit | null> {
  const result = await strapiFetch<StrapiDataResponse<EventForEdit>>(
    "/admin/events/:slug/edit",
    { slug },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data || null
}

/**
 * Update event data
 */
export async function updateEvent(slug: string, data: EventUpdateData): Promise<UpdateEventResult> {
  const result = await strapiFetch<
    StrapiDataResponse<{ documentId: string; slug: string; name: string }>
  >(
    "/admin/events/:slug/edit",
    { slug },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update event",
    }
  }

  // Revalidate public pages after successful update
  await revalidateEventPages(slug)

  return {
    success: true,
    event: result.data?.data,
  }
}

/**
 * Get available event locations for the dropdown
 */
export async function getLocations(): Promise<LocationOption[]> {
  const result = await strapiFetch<StrapiDataResponse<LocationOption[]>>(
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
  const result = await strapiFetch<StrapiDataResponse<VenueOption[]>>(
    "/admin/events/venues",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return []
  return result.data.data || []
}

/**
 * Get available organizers (hosts, mentors, founders) for the dropdown
 */
export async function getOrganizers(): Promise<OrganizerOption[]> {
  const result = await strapiFetch<StrapiDataResponse<OrganizerOption[]>>(
    "/admin/events/organizers",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) {
    console.log("[getOrganizers] Failed:", result.error)
    return []
  }

  return result.data.data || []
}

export interface PublishResult {
  success: boolean
  isPublished?: boolean
  error?: string
}

/**
 * Publish a draft event
 */
export async function publishEvent(slug: string): Promise<PublishResult> {
  const result = await strapiFetch<StrapiDataResponse<{ isPublished: boolean }>>(
    "/admin/events/:slug/publish",
    { slug },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to publish event",
    }
  }

  // Revalidate public pages after publishing
  await revalidateEventPages(slug)

  return {
    success: true,
    isPublished: result.data?.data?.isPublished,
  }
}

/**
 * Unpublish an event
 */
export async function unpublishEvent(slug: string): Promise<PublishResult> {
  const result = await strapiFetch<StrapiDataResponse<{ isPublished: boolean }>>(
    "/admin/events/:slug/unpublish",
    { slug },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to unpublish event",
    }
  }

  // Revalidate public pages after unpublishing
  await revalidateEventPages(slug)

  return {
    success: true,
    isPublished: result.data?.data?.isPublished,
  }
}

/**
 * Get event publication status
 */
export async function getEventPublishStatus(
  slug: string
): Promise<{ isPublished: boolean } | null> {
  const result = await strapiFetch<StrapiDataResponse<{ isPublished: boolean }>>(
    "/admin/events/:slug/preview",
    { slug },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return { isPublished: result.data.data?.isPublished ?? false }
}
