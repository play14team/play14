"use server"

import type { SlugParamsProps } from "@/libs/slug-params"
import { normalizeConnection, restQuery } from "@/libs/strapi-client"
import {
  eventCalendarPopulate,
  eventDetailsPopulate,
  eventItemPopulate,
  eventMarkersPopulate,
  eventNavPopulate,
  testimonialsPopulate,
} from "@/libs/strapi-populate"

// Types - will be replaced by OpenAPI generated types when available
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
  // Allow additional Mapbox properties
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
      socialNetworks?: Array<{ id: string; type: string; url: string }>
    }>
  }>
  hosts?: Player[]
  mentors?: Player[]
  players?: Player[]
  media?: Array<{ id: string; url: string; type: string }>
}

interface Testimonial {
  documentId: string
  content: string
  url?: string
  audio?: { name: string; url: string }
  author?: {
    name: string
    slug: string
    tagline?: string
    avatar?: UploadFile
  }
}

/**
 * Compute ticketingMode for backwards compatibility
 * If ticketingMode is explicitly set to "internal" or "external", use it
 * Otherwise derive from legacy fields (stripeAccount for internal, registration for external)
 */
function computeTicketingMode(
  event: Event & { stripeAccount?: { documentId?: string } }
): "none" | "internal" | "external" {
  // If explicitly set to internal or external, use it
  if (event.ticketingMode === "internal" || event.ticketingMode === "external") {
    return event.ticketingMode
  }

  // Derive from legacy fields for existing events or when mode is "none"
  // Check stripeAccount first (internal takes priority)
  if (event.stripeAccount?.documentId) {
    return "internal"
  }
  if (event.registration?.link || event.registration?.widgetCode) {
    return "external"
  }
  return "none"
}

/**
 * Get paginated events list
 * REST equivalent of: events/grid.graphql
 */
export async function getEvents(
  page: number,
  pageSize: number,
  status?: string,
  location?: string,
  country?: string
) {
  const filters: Record<string, unknown> = {}
  if (status) {
    filters.eventStatus = { $eqi: status }
  }
  if (location) {
    filters.location = {
      ...((filters.location as object) || {}),
      slug: { $eqi: location },
    }
  }
  if (country) {
    filters.location = {
      ...((filters.location as object) || {}),
      country: { $eqi: country },
    }
  }

  const response = await restQuery<Event[]>("events", {
    sort: ["start:desc"],
    pagination: { page, pageSize: Math.min(pageSize, 100) },
    filters,
    populate: eventItemPopulate,
  })

  // Normalize to match GraphQL _connection structure
  return {
    events_connection: normalizeConnection(response),
  }
}

/**
 * Get all events with optional filters
 * Fetches all pages since Strapi limits pageSize to 100
 */
export async function getAllEvents(status?: string, location?: string, country?: string) {
  const allEvents: Event[] = []
  let page = 1
  const pageSize = 100

  const filters: Record<string, unknown> = {}
  if (status) {
    filters.eventStatus = { $eqi: status }
  }
  if (location) {
    filters.location = {
      ...((filters.location as object) || {}),
      slug: { $eqi: location },
    }
  }
  if (country) {
    filters.location = {
      ...((filters.location as object) || {}),
      country: { $eqi: country },
    }
  }

  while (true) {
    const response = await restQuery<Event[]>("events", {
      sort: ["start:desc"],
      pagination: { page, pageSize },
      filters,
      populate: eventItemPopulate,
    })

    const events = response.data || []
    allEvents.push(...events)

    if (events.length < pageSize) {
      break
    }
    page++
  }

  return allEvents
}

/**
 * Get single event by slug
 * REST equivalent of: events/details.graphql
 */
export async function getEvent({ params }: SlugParamsProps) {
  const { slug } = await params
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

  // Ensure ticketingMode is computed correctly for backwards compatibility
  return {
    ...event,
    ticketingMode: computeTicketingMode(event),
  }
}

/**
 * Get all event slugs for static generation
 * With on-demand revalidation, all events (past and future) can be pre-generated.
 * Future events will be revalidated when updated in admin.
 * REST equivalent of: events/slugs.graphql
 */
export async function getEventSlugs() {
  const response = await restQuery<Array<{ slug: string }>>("events", {
    fields: ["slug"],
    pagination: { page: 1, pageSize: 5000 },
  })

  return {
    events: response.data || [],
  }
}

/**
 * Get all events for navigation
 * REST equivalent of: events/nav.graphql
 * Note: Strapi limits pageSize to 100, so we need to fetch all pages
 */
export async function getEventNav() {
  const allEvents: Event[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<Event[]>("events", {
      sort: ["start:desc"],
      pagination: { page, pageSize },
      populate: eventNavPopulate,
    })

    const events = response.data || []
    allEvents.push(...events)

    if (events.length < pageSize) {
      break
    }
    page++
  }

  return allEvents
}

/**
 * Get events for map markers
 * REST equivalent of: events/markers.graphql
 */
export async function getEventMarkers() {
  // Fetch all events and filter client-side since Strapi JSON field filtering is complex
  const response = await restQuery<Event[]>("events", {
    sort: ["start:asc"],
    filters: {
      eventStatus: { $ne: "Cancelled" },
    },
    pagination: { page: 1, pageSize: 5000 },
    populate: eventMarkersPopulate,
  })

  const allEvents = response.data || []

  // Filter events that have venue location coordinates
  const eventsWithLocation = allEvents.filter((event) => {
    const location = event.venue?.location
    if (!location) return false

    // Check for Mapbox format (geometry.coordinates)
    if ("geometry" in location && location.geometry?.coordinates) {
      const [lng, lat] = location.geometry.coordinates
      return lng !== undefined && lat !== undefined
    }

    // Check for simple format (lat/lng)
    if ("lng" in location && "lat" in location) {
      return location.lng !== undefined && location.lat !== undefined
    }

    return false
  })

  return eventsWithLocation
}

/**
 * Get events for calendar
 * REST equivalent of: events/calendar.graphql
 */
export async function getEventCalendar() {
  const response = await restQuery<Event[]>("events", {
    sort: ["start:desc"],
    pagination: { page: 1, pageSize: 5000 },
    populate: eventCalendarPopulate,
  })

  return response.data || []
}

/**
 * Get testimonials
 * REST equivalent of: events/testimonials.graphql
 */
export async function getTestimonials() {
  const response = await restQuery<Testimonial[]>("testimonials", {
    pagination: { page: 1, pageSize: 5000 },
    populate: testimonialsPopulate,
  })

  return response.data || []
}

/**
 * Get hosting content
 * REST equivalent of: events/hosting.graphql
 */
export async function getHosting() {
  const response = await restQuery<{ content: string }>("hosting", {})

  return response.data
}

/**
 * Get event counts by year
 * Returns a record of year -> count for year navigation
 */
export async function getEventYearCounts(): Promise<Record<number, number>> {
  const response = await restQuery<Array<{ start: string }>>("events", {
    fields: ["start"],
    pagination: { page: 1, pageSize: 5000 },
  })

  const events = response.data || []
  const yearCounts: Record<number, number> = {}

  events.forEach((event) => {
    if (event.start) {
      const year = new Date(event.start).getFullYear()
      yearCounts[year] = (yearCounts[year] || 0) + 1
    }
  })

  return yearCounts
}

/**
 * Get paginated events for a specific year
 */
export async function getEventsByYear(year: number, page: number, pageSize: number) {
  const startOfYear = `${year}-01-01T00:00:00.000Z`
  const endOfYear = `${year}-12-31T23:59:59.999Z`

  const response = await restQuery<Event[]>("events", {
    sort: ["start:desc"],
    pagination: { page, pageSize: Math.min(pageSize, 100) },
    filters: {
      start: {
        $gte: startOfYear,
        $lte: endOfYear,
      },
    },
    populate: eventItemPopulate,
  })

  return {
    events_connection: normalizeConnection(response),
  }
}

/**
 * Get all events for a specific year
 * Fetches all pages since Strapi limits pageSize to 100
 */
export async function getAllEventsByYear(year: number) {
  const allEvents: Event[] = []
  let page = 1
  const pageSize = 100

  const startOfYear = `${year}-01-01T00:00:00.000Z`
  const endOfYear = `${year}-12-31T23:59:59.999Z`

  while (true) {
    const response = await restQuery<Event[]>("events", {
      sort: ["start:desc"],
      pagination: { page, pageSize },
      filters: {
        start: {
          $gte: startOfYear,
          $lte: endOfYear,
        },
      },
      populate: eventItemPopulate,
    })

    const events = response.data || []
    allEvents.push(...events)

    if (events.length < pageSize) {
      break
    }
    page++
  }

  return allEvents
}
