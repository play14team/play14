"use server"

import { strapiFetch } from "@/libs/strapi-client"

// Types matching the public event interface for preview consistency
interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
}

interface GeoLocation {
  lat?: number
  lng?: number
  place_name?: string
  geometry?: {
    coordinates: [number, number]
    type?: string
  }
  id?: string
  text?: string
  type?: string
  center?: [number, number]
  address?: string
  context?: unknown[]
  relevance?: number
  place_type?: string[]
  properties?: Record<string, unknown>
  [key: string]: unknown
}

interface Location {
  slug?: string
  name: string
  country: string
  location?: GeoLocation
}

interface Venue {
  documentId?: string
  name: string
  website?: string
  location?: GeoLocation
  addressDetails?: string
}

interface Player {
  documentId: string
  slug: string
  name: string
  position?: string
  avatar?: UploadFile
  socialNetworks?: Array<{ id: string; url: string; type: string }>
}

export interface PreviewEvent {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  timezone?: string
  eventStatus: string
  description?: string
  contactEmail?: string
  publishedAt?: string
  defaultImage?: UploadFile
  images?: UploadFile[]
  location?: Location
  venue?: Venue
  timetable?: Array<{
    id: string
    day: string
    description?: string
    timeslots?: Array<{ id: string; time: string; description?: string }>
  }>
  registration?: { link?: string; widgetCode?: string }
  sponsorships?: Array<{
    id: string
    category: string
    sponsors?: Array<{
      name: string
      url?: string
      logo?: UploadFile
      socialNetworks?: Array<{ id: string; type: string; url: string }>
    }>
  }>
  hosts?: Player[]
  mentors?: Player[]
  players?: Player[]
  media?: Array<{ id: string; url: string; type: string }>
  ticketingMode?: "none" | "internal" | "external"
  ticketTypes?: Array<{
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
  }>
  isPublished: boolean
  isDraft: boolean
}

/**
 * Get event preview data (for draft events)
 * Returns the full event data for preview purposes
 */
export async function getEventPreview(slug: string): Promise<PreviewEvent | null> {
  const result = await strapiFetch<{ data: PreviewEvent }>(
    "/admin/events/:slug/preview",
    { slug },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data || null
}
