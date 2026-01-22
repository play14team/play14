"use server"

import type { SlugParamsProps } from "@/libs/slug-params"
import { normalizeConnection, restQuery } from "@/libs/strapi-client"
import { gameDetailsPopulate, gameItemPopulate, gameNavPopulate } from "@/libs/strapi-populate"

// Types - will be replaced by OpenAPI generated types when available
interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
}

interface Tag {
  id: string
  value: string
}

interface Player {
  name: string
  slug: string
  avatar?: UploadFile
}

interface Game {
  documentId: string
  slug: string
  name: string
  category?: string
  scale?: string
  timebox?: string
  summary?: string
  credits?: string
  description?: string
  publishedAt?: string
  tags?: Tag[]
  materials?: Array<{ id: string; value: string }>
  preparationSteps?: Array<{ id: string; value: string }>
  safety?: Array<{ id: string; key: string; value: string }>
  defaultImage?: UploadFile
  images?: UploadFile[]
  resources?: Array<{ name: string; url: string }>
  firstPlayedAt?: { name: string; slug: string }
  documentedBy?: Player[]
  proposedBy?: Player[]
  ratings?: { energy: number; connection: number; silliness: number }
}

/**
 * Get paginated games list
 * REST equivalent of: games/grid.graphql
 */
export async function getGames(page: number, pageSize: number, category?: string, tag?: string) {
  const filters: Record<string, unknown> = {}
  if (category) {
    filters.category = { $eqi: category }
  }
  if (tag) {
    filters.tags = { value: { $eqi: tag } }
  }

  const response = await restQuery<Game[]>("games", {
    sort: ["name:asc"],
    pagination: { page, pageSize: Math.min(pageSize, 100) },
    filters,
    populate: gameItemPopulate,
  })

  // Normalize to match GraphQL _connection structure
  return {
    games_connection: normalizeConnection(response),
  }
}

/**
 * Get all games with optional filters
 * Fetches all pages since Strapi limits pageSize to 100
 */
export async function getAllGames(category?: string, tag?: string) {
  const allGames: Game[] = []
  let page = 1
  const pageSize = 100

  const filters: Record<string, unknown> = {}
  if (category) {
    filters.category = { $eqi: category }
  }
  if (tag) {
    filters.tags = { value: { $eqi: tag } }
  }

  while (true) {
    const response = await restQuery<Game[]>("games", {
      sort: ["name:asc"],
      pagination: { page, pageSize },
      filters,
      populate: gameItemPopulate,
    })

    const games = response.data || []
    allGames.push(...games)

    if (games.length < pageSize) {
      break
    }
    page++
  }

  return allGames
}

/**
 * Get single game by slug
 * REST equivalent of: games/details.graphql
 */
export async function getGame({ params }: SlugParamsProps) {
  const { slug } = await params
  const response = await restQuery<Game[]>("games", {
    filters: {
      slug: { $eq: slug },
    },
    populate: gameDetailsPopulate,
  })

  return response.data?.[0] || null
}

/**
 * Get all game slugs for static generation
 * REST equivalent of: games/slugs.graphql
 */
export async function getGameSlugs() {
  const response = await restQuery<Array<{ slug: string }>>("games", {
    fields: ["slug"],
    pagination: { page: 1, pageSize: 5000 },
  })

  return {
    games: response.data || [],
  }
}

/**
 * Get all games for navigation
 * REST equivalent of: games/nav.graphql
 * Note: Strapi limits pageSize to 100, so we need to fetch all pages
 */
export async function getGameNav() {
  const allGames: Game[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<Game[]>("games", {
      sort: ["name:asc"],
      pagination: { page, pageSize },
      populate: gameNavPopulate,
    })

    const games = response.data || []
    allGames.push(...games)

    if (games.length < pageSize) {
      break
    }
    page++
  }

  return allGames
}

/**
 * Get all unique game categories
 * Used for static generation of category filter pages
 */
export async function getGameCategories(): Promise<string[]> {
  const response = await restQuery<Array<{ category?: string }>>("games", {
    fields: ["category"],
    pagination: { page: 1, pageSize: 5000 },
  })

  const games = response.data || []
  const categories = new Set<string>()

  games.forEach((game) => {
    if (game.category) {
      categories.add(game.category)
    }
  })

  const result = Array.from(categories).sort()
  console.log(`[Build] Found ${result.length} unique game categories`)
  return result
}

/**
 * Get all unique game tags
 * Used for static generation of tag filter pages
 */
export async function getGameTags(): Promise<string[]> {
  const response = await restQuery<Array<{ tags?: Tag[] }>>("games", {
    fields: ["id"],
    populate: { tags: { fields: ["value"] } },
    pagination: { page: 1, pageSize: 5000 },
  })

  const games = response.data || []
  const tags = new Set<string>()

  games.forEach((game) => {
    game.tags?.forEach((tag) => {
      if (tag.value) {
        tags.add(tag.value)
      }
    })
  })

  const result = Array.from(tags).sort()
  console.log(`[Build] Found ${result.length} unique game tags`)
  return result
}
