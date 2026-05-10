"use server"

import type { SlugParamsProps } from "@/libs/slug-params"
import { normalizeConnection, restQuery } from "@/libs/strapi-client"
import {
  playerDetailsPopulate,
  playerItemPopulate,
  playerNavPopulate,
} from "@/libs/strapi-populate"

// Types - will be replaced by OpenAPI generated types when available
interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
}

interface SocialNetwork {
  id: string
  url: string
  socialNetworkType: string
}

interface EventItem {
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

interface Player {
  documentId: string
  slug: string
  name: string
  position?: string
  company?: string
  tagline?: string
  bio?: string
  website?: string
  location?: string
  avatar?: UploadFile
  socialNetworks?: SocialNetwork[]
  attended?: EventItem[]
  hosted?: EventItem[]
  mentored?: EventItem[]
}

const visibleFilter = {
  $or: [{ visible: { $eq: true } }, { visible: { $null: true } }],
}

/**
 * Build filter object for player queries
 */
function buildPlayerFilters(position?: string, letter?: string): Record<string, unknown> {
  const filters: Record<string, unknown> = { ...visibleFilter }
  if (position) {
    filters.position = { $eqi: position }
  }
  if (letter) {
    filters.name = { $startsWithi: letter }
  }
  return filters
}

/**
 * Get paginated players list
 * REST equivalent of: players/grid.graphql
 */
export async function getPlayers(
  page: number,
  pageSize: number,
  position?: string,
  letter?: string
) {
  const filters = buildPlayerFilters(position, letter)

  const response = await restQuery<Player[]>("players", {
    sort: ["name:asc"],
    pagination: { page, pageSize: Math.min(pageSize, 100) },
    filters,
    populate: playerItemPopulate,
  })

  // Normalize to match GraphQL _connection structure
  return {
    players_connection: normalizeConnection(response),
  }
}

/**
 * Get all players with optional position filter
 * Fetches all pages since Strapi limits pageSize to 100
 */
export async function getAllPlayers(position?: string, letter?: string) {
  const allPlayers: Player[] = []
  let page = 1
  const pageSize = 100

  const filters = buildPlayerFilters(position, letter)

  while (true) {
    const response = await restQuery<Player[]>("players", {
      sort: ["name:asc"],
      pagination: { page, pageSize },
      filters,
      populate: playerItemPopulate,
    })

    const players = response.data || []
    allPlayers.push(...players)

    if (players.length < pageSize) {
      break
    }
    page++
  }

  return allPlayers
}

/**
 * Get count of players per first letter of name
 * Used for alphabet navigation to show which letters have players
 * NOTE: Fetches all player names - performance is acceptable for <10k players.
 * TODO: Consider Strapi aggregation endpoint for larger datasets.
 */
export async function getPlayerLetterCounts(): Promise<Record<string, number>> {
  try {
    // Fetch all players with minimal data (just names)
    const allPlayers: Array<{ name: string }> = []
    let page = 1
    const pageSize = 100

    while (true) {
      const response = await restQuery<Array<{ name: string }>>("players", {
        fields: ["name"],
        filters: { ...visibleFilter },
        pagination: { page, pageSize },
        sort: ["name:asc"],
      })

      const players = response.data || []
      allPlayers.push(...players)

      if (players.length < pageSize) {
        break
      }
      page++
    }

    // Count players by first letter
    const counts: Record<string, number> = {}

    allPlayers.forEach((player) => {
      const firstLetter = player.name.charAt(0).toUpperCase()
      if (/[A-Z]/.test(firstLetter)) {
        counts[firstLetter] = (counts[firstLetter] || 0) + 1
      }
    })

    return counts
  } catch (error) {
    console.error("Failed to fetch player letter counts:", error)
    return {} // Return empty counts on error - all letters will be disabled
  }
}

/**
 * Get single player by slug
 * REST equivalent of: players/details.graphql
 */
export async function getPlayer({ params }: SlugParamsProps) {
  const { slug } = await params
  const response = await restQuery<Player[]>("players", {
    filters: {
      ...visibleFilter,
      slug: { $eq: slug },
    },
    populate: playerDetailsPopulate,
  })

  return response.data?.[0] || null
}

/**
 * Get all player slugs for static generation
 * REST equivalent of: players/slugs.graphql
 */
export async function getPlayerSlugs() {
  const response = await restQuery<Array<{ slug: string }>>("players", {
    fields: ["slug"],
    filters: { ...visibleFilter },
    pagination: { page: 1, pageSize: 5000 },
  })

  return {
    players: response.data || [],
  }
}

/**
 * Get all players for navigation
 * REST equivalent of: players/nav.graphql
 * Note: Strapi limits pageSize to 100, so we need to fetch all pages
 */
export async function getPlayerNav() {
  const allPlayers: Player[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<Player[]>("players", {
      sort: ["name:asc"],
      pagination: { page, pageSize },
      filters: { ...visibleFilter },
      populate: playerNavPopulate,
    })

    const players = response.data || []
    allPlayers.push(...players)

    // If we got fewer than pageSize, we've reached the end
    if (players.length < pageSize) {
      break
    }
    page++
  }

  return allPlayers
}

import { strapiFetch } from "@/libs/strapi-client"

// Types for pending attendance claims
interface PendingAttendanceClaim {
  documentId: string
  claimStatus: "pending"
  event: EventItem
}

/**
 * Get pending attendance claims for a player
 * Used to display pending events on player profile
 */
export async function getPendingAttendanceClaims(
  playerDocumentId: string
): Promise<PendingAttendanceClaim[]> {
  const result = await strapiFetch<{ data: PendingAttendanceClaim[] }>(
    "/attendance-claims/player/:playerDocumentId",
    { playerDocumentId },
    { cache: "no-store", noAuth: true }
  )

  if (!result.ok) {
    console.error(`[Players] Failed to fetch pending claims: ${result.status}`)
    return []
  }

  return result.data?.data || []
}
