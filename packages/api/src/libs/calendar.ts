/**
 * Calendar utility for generating ICS files
 * Used to attach calendar events to confirmation emails
 */

import { type EventAttributes, type EventStatus, createEvent } from "ics"

interface EventData {
  name: string
  slug: string
  description?: string
  start: string | Date
  end: string | Date
  eventStatus?: string
  contactEmail?: string
  venue?: {
    name?: string
    website?: string
    location?: {
      place_name?: string
      geometry?: {
        coordinates?: [number, number]
      }
      lat?: number
      lng?: number
    }
  }
}

/**
 * Generate an ICS calendar file content for an event
 */
export async function generateEventICS(event: EventData): Promise<string> {
  const start = new Date(event.start)
  const end = new Date(event.end)

  const evt: EventAttributes = {
    start: [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ],
    startInputType: "utc",
    end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
    endInputType: "utc",
    title: `#play14 - ${event.name}`,
    description: event.description ? stripHtml(event.description) : undefined,
    location: getLocation(event),
    url: event.venue?.website || `https://play14.org/events/${event.slug}`,
    categories: ["play", "learning by doing", "unconference"],
    status: getStatus(event.eventStatus),
  }

  // Add geo coordinates if available
  if (event.venue?.location) {
    const loc = event.venue.location
    let longitude: number | undefined
    let latitude: number | undefined

    // Handle Mapbox format (geometry.coordinates)
    if (loc.geometry?.coordinates) {
      longitude = loc.geometry.coordinates[0]
      latitude = loc.geometry.coordinates[1]
    }
    // Handle simple format (lat/lng)
    else if (typeof loc.lng === "number" && typeof loc.lat === "number") {
      longitude = loc.lng
      latitude = loc.lat
    }

    if (latitude !== undefined && longitude !== undefined) {
      evt.geo = { lat: latitude, lon: longitude }
    }
  }

  // Add organizer info
  if (event.contactEmail) {
    evt.organizer = { name: `#play14 ${event.name}`, email: event.contactEmail }
  }

  return new Promise((resolve, reject) => {
    createEvent(evt, (error, value) => {
      if (error) {
        reject(error)
      } else {
        resolve(value)
      }
    })
  })
}

/**
 * Generate Google Calendar add event URL
 */
export function generateGoogleCalendarUrl(event: EventData): string {
  const start = new Date(event.start)
  const end = new Date(event.end)

  const formatDate = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `#play14 - ${event.name}`,
    dates: `${formatDate(start)}/${formatDate(end)}`,
    details: event.description ? stripHtml(event.description).substring(0, 1000) : "",
    location: getLocation(event),
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate Outlook.com add event URL
 */
export function generateOutlookCalendarUrl(event: EventData): string {
  const start = new Date(event.start)
  const end = new Date(event.end)

  const params = new URLSearchParams({
    rru: "addevent",
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    subject: `#play14 - ${event.name}`,
    body: event.description ? stripHtml(event.description).substring(0, 1000) : "",
    location: getLocation(event),
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Get formatted location string
 */
function getLocation(event: EventData): string {
  if (!event.venue) {
    return "Location TBA"
  }

  const parts = [event.venue.name]

  if (event.venue.location?.place_name) {
    parts.push(event.venue.location.place_name)
  }

  return parts.filter(Boolean).join(" - ")
}

/**
 * Convert event status to ICS status
 */
function getStatus(eventStatus?: string): EventStatus {
  switch (eventStatus) {
    case "Cancelled":
      return "CANCELLED"
    case "Announced":
      return "TENTATIVE"
    default:
      return "CONFIRMED"
  }
}

/**
 * Strip HTML tags from text safely
 *
 * Security notes:
 * - We strip HTML tags FIRST, then decode entities to prevent double-unescaping
 * - We use a loop to handle nested/malformed tags that could bypass single-pass sanitization
 * - The final output is plain text suitable for ICS calendar descriptions
 *
 * Order of operations (important for security):
 * 1. Strip tags first - removes <script>, <a href="...">, etc.
 * 2. Decode entities in a SINGLE PASS using a map to prevent double-unescaping
 *
 * The single-pass approach prevents attacks where double-encoded entities like
 * &amp;lt; could become &lt; and then < if decoded in multiple passes.
 */
function stripHtml(html: string): string {
  // First, strip HTML tags in a loop to handle nested/malformed content
  // This prevents incomplete sanitization where <scr<script>ipt> could bypass single-pass
  let text = html
  let previous: string
  do {
    previous = text
    text = text.replace(/<[^>]*>/g, "")
  } while (text !== previous)

  // Decode HTML entities in a SINGLE PASS to prevent double-unescaping attacks
  // Using a single regex with a replacement map ensures &amp;lt; stays as &lt;
  // rather than being decoded twice to <
  const entityMap: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
  }

  // Single-pass entity replacement using one regex
  text = text.replace(
    /&(?:nbsp|amp|lt|gt|quot|#39|#x27|#(\d+)|#x([0-9a-fA-F]+));/gi,
    (match, decimalCode, hexCode) => {
      // Check named/common entities first
      const mapped = entityMap[match.toLowerCase()]
      if (mapped !== undefined) {
        return mapped
      }
      // Handle decimal numeric entities (&#123;)
      if (decimalCode !== undefined) {
        return String.fromCharCode(Number.parseInt(decimalCode, 10))
      }
      // Handle hex numeric entities (&#xABC;)
      if (hexCode !== undefined) {
        return String.fromCharCode(Number.parseInt(hexCode, 16))
      }
      // Return original if no match (shouldn't happen with this regex)
      return match
    }
  )

  // Normalize whitespace
  return text.replace(/\s+/g, " ").trim()
}
