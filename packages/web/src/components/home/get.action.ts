"use server"

import { restQuery, normalizeEntity } from "@/libs/strapi-client"
import { homePopulate, eventItemPopulate } from "@/libs/strapi-populate"
import { getTestimonials } from "@/components/events/get.action"
import { Testimonial } from "@/models/strapi"
import { shuffleArray } from "@/libs/arrays"
import { HOME_TESTIMONIALS_COUNT } from "./constants"

// Types - will be replaced by OpenAPI generated types when available
interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
  hash?: string
  mime?: string
  provider?: string
  size?: number
}

interface Home {
  images?: UploadFile[]
}

interface Event {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  timezone?: string
  eventStatus: string
  defaultImage?: UploadFile
  location?: {
    name: string
    country: string
  }
}

interface Expectation {
  documentId: string
  title: string
  type: string
  icon: string
  content?: string
}

/**
 * Get home page data (images for gallery)
 * REST equivalent of: home/home.graphql
 */
export async function getHome() {
  const response = await restQuery<Home>("home", {
    populate: homePopulate,
  })
  return normalizeEntity(response)
}

/**
 * Get upcoming events
 * REST equivalent of: events/grid.graphql UpcomingEvents query
 */
export async function getUpcomingEvents(today: string) {
  const response = await restQuery<Event[]>("events", {
    sort: ["start:asc"],
    filters: {
      end: { $gte: today },
    },
    populate: eventItemPopulate,
  })
  return response.data || []
}

/**
 * Get expectations by type
 * REST equivalent of: home/expectations.graphql
 */
export async function getExpectations(type: string) {
  const response = await restQuery<Expectation[]>("expectations", {
    filters: {
      type: { $eq: type },
    },
  })
  return response.data || []
}

/**
 * Get random testimonials for home page
 * Shuffles server-side on each render (respects page revalidate cache)
 * Filters to only text testimonials with named authors (excludes audio and anonymous)
 */
export async function getRandomTestimonials(
  count: number = HOME_TESTIMONIALS_COUNT,
) {
  try {
    const allTestimonials = await getTestimonials()

    if (!allTestimonials || allTestimonials.length === 0) {
      return []
    }

    // Filter to only text testimonials (no audio) with named authors
    const textTestimonials = allTestimonials.filter(
      (testimonial) => !testimonial.audio && testimonial.author,
    )

    if (textTestimonials.length === 0) {
      return []
    }

    // Shuffle and return requested count
    return shuffleArray(textTestimonials).slice(0, count)
  } catch (error) {
    console.error("Failed to fetch random testimonials:", error)
    return []
  }
}

interface StatisticsEvent {
  eventStatus: string
  location?: {
    country: string
  }
}

export interface Play14Statistics {
  countries: number
  events: number
  players: number
  games: number
  yearsSince2014: number
}

/**
 * Get #play14 statistics for the home page
 * Fetches counts for countries, events (excluding cancelled), players, and games
 */
export async function getStatistics(): Promise<Play14Statistics> {
  const currentYear = new Date().getFullYear()
  const yearsSince2014 = currentYear - 2014

  try {
    // Fetch all data in parallel for performance
    const [eventsResponse, playersResponse, gamesResponse] = await Promise.all([
      // Get all events to count unique countries and non-cancelled events
      restQuery<StatisticsEvent[]>("events", {
        fields: ["eventStatus"],
        populate: {
          location: {
            fields: ["country"],
          },
        },
        pagination: { page: 1, pageSize: 5000 },
      }),
      // Get player count
      restQuery<Array<{ documentId: string }>>("players", {
        fields: ["documentId"],
        pagination: { page: 1, pageSize: 5000 },
      }),
      // Get games count
      restQuery<Array<{ documentId: string }>>("games", {
        fields: ["documentId"],
        pagination: { page: 1, pageSize: 5000 },
      }),
    ])

    const allEvents = eventsResponse.data || []
    const allPlayers = playersResponse.data || []
    const allGames = gamesResponse.data || []

    // Filter out cancelled events
    const nonCancelledEvents = allEvents.filter(
      (event) => event.eventStatus !== "Cancelled",
    )

    // Get unique countries from non-cancelled events
    const uniqueCountries = new Set<string>()
    nonCancelledEvents.forEach((event) => {
      if (event.location?.country) {
        uniqueCountries.add(event.location.country)
      }
    })

    return {
      countries: uniqueCountries.size,
      events: nonCancelledEvents.length,
      players: allPlayers.length,
      games: allGames.length,
      yearsSince2014,
    }
  } catch (error) {
    console.error("Failed to fetch statistics:", error)
    // Return fallback values on error
    return {
      countries: 0,
      events: 0,
      players: 0,
      games: 0,
      yearsSince2014,
    }
  }
}
