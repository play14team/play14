import { cache } from "react"
import { restQuery } from "@/libs/strapi-client"
import { eventDetailsPopulate } from "@/libs/strapi-populate"

// Types matching get.action.ts
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
  socialNetworks?: Array<{ id: string; url: string; socialNetworkType: string }>
}

interface Event {
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
  ticketingMode?: "none" | "internal" | "external"
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
      socialNetworks?: Array<{ id: string; socialNetworkType: string; url: string }>
    }>
  }>
  hosts?: Player[]
  mentors?: Player[]
  players?: Player[]
  media?: Array<{ id: string; url: string; mediaType: string }>
}

/**
 * Compute ticketingMode for backwards compatibility
 */
function computeTicketingMode(
  event: Event & { stripeAccount?: { documentId?: string } }
): "none" | "internal" | "external" {
  if (event.ticketingMode === "internal" || event.ticketingMode === "external") {
    return event.ticketingMode
  }
  if (event.stripeAccount?.documentId) {
    return "internal"
  }
  if (event.registration?.link || event.registration?.widgetCode) {
    return "external"
  }
  return "none"
}

/**
 * Cached event fetch by slug.
 * React's cache() deduplicates calls with the same slug within a single request.
 * This prevents double-fetching when both generateMetadata and the page component
 * need the same event data.
 */
export const getEventBySlug = cache(async (slug: string, locale?: string) => {
  // Always fetch in default locale to get all images and relations
  // (Strapi treats media relations as localized, so non-default locale entries lack them)
  const response = await restQuery<(Event & { stripeAccount?: { documentId?: string } })[]>(
    "events",
    {
      filters: {
        slug: { $eq: slug },
      },
      populate: eventDetailsPopulate,
    }
  )

  const event = response.data?.[0]
  if (!event) return null

  const result = {
    ...event,
    ticketingMode: computeTicketingMode(event),
  }

  // Overlay localized description for non-default locales
  if (locale && locale !== "en") {
    try {
      const localeResponse = await restQuery<(Event & { description?: string })[]>("events", {
        filters: { slug: { $eq: slug } },
        fields: ["description"],
        locale,
      })
      const localeEvent = localeResponse.data?.[0]
      if (localeEvent?.description) {
        result.description = localeEvent.description
      }
    } catch {
      // Fall back to English description if locale query fails
    }
  }

  return result
})
