"use server"

import { normalizeEntity, restQuery } from "@/libs/strapi-client"
import { playerItemPopulate, storyPopulate } from "@/libs/strapi-populate"

// Types - will be replaced by OpenAPI generated types when available
interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
}

interface HistoryItem {
  id: string
  date?: string
  dateFormat?: string
  additionalText?: string
  title?: string
  description?: string
  image?: UploadFile
}

interface History {
  founders?: string
  keyMoments?: string
  intro?: string
  items?: HistoryItem[]
}

interface Player {
  documentId: string
  slug: string
  name: string
  position?: string
  avatar?: UploadFile
  socialNetworks?: Array<{
    id: string
    url: string
    type: string
  }>
}

/**
 * Get story page data (history + founders)
 * REST equivalent of: about/story.graphql
 * Note: This query fetches from two endpoints
 */
export async function getStory(locale?: string) {
  try {
    const [historyResponse, foundersResponse] = await Promise.all([
      restQuery<History>("history", {
        populate: storyPopulate,
        locale,
      }),
      restQuery<Player[]>("players", {
        sort: ["name:asc"],
        filters: {
          position: { $eq: "Founder" },
        },
        populate: playerItemPopulate,
      }),
    ])

    return {
      history: normalizeEntity(historyResponse),
      founders: foundersResponse.data || [],
    }
  } catch (error) {
    // If the requested locale doesn't exist, fall back to default (omit locale param)
    if (locale) {
      console.warn(`[getStory] Locale "${locale}" not found, falling back to default locale`)
      try {
        const [historyResponse, foundersResponse] = await Promise.all([
          restQuery<History>("history", {
            populate: storyPopulate,
          }),
          restQuery<Player[]>("players", {
            sort: ["name:asc"],
            filters: {
              position: { $eq: "Founder" },
            },
            populate: playerItemPopulate,
          }),
        ])

        return {
          history: normalizeEntity(historyResponse),
          founders: foundersResponse.data || [],
        }
      } catch {
        // Even default locale failed, return empty data rather than crashing
        return { history: null, founders: [] }
      }
    }
    throw error
  }
}
