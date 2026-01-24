"use server"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface LikedItemContributor {
  documentId: string
  name: string
  slug: string
  avatar: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  } | null
}

export interface LikedItemPublic {
  documentId: string
  name: string
  description: string | null
  url: string
  image: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
      medium?: { url: string }
    }
  } | null
  contributors: LikedItemContributor[]
}

export interface LikedItemsPublicResponse {
  data: LikedItemPublic[]
}

/**
 * Get all liked items for public showcase
 */
export async function getPublicLikedItems(): Promise<LikedItemPublic[]> {
  try {
    const response = await fetch(`${STRAPI_URL}/api/liked-items/showcase`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      console.error(`[LikedItems] Failed to fetch public liked items: ${response.status}`)
      return []
    }

    const data: LikedItemsPublicResponse = await response.json()
    return data.data || []
  } catch (error) {
    console.error("[LikedItems] Error fetching public liked items:", error)
    return []
  }
}
