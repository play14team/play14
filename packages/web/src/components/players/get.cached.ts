import { cache } from "react"
import { restQuery } from "@/libs/strapi-client"
import { playerDetailsPopulate } from "@/libs/strapi-populate"

// Types matching get.action.ts
interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
}

interface SocialNetwork {
  id: string
  url: string
  type: string
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
 * Cached player fetch by slug.
 * React's cache() deduplicates calls with the same slug within a single request.
 * This prevents double-fetching when both generateMetadata and the page component
 * need the same player data.
 */
export const getPlayerBySlug = cache(async (slug: string) => {
  const response = await restQuery<Player[]>("players", {
    filters: {
      ...visibleFilter,
      slug: { $eq: slug },
    },
    populate: playerDetailsPopulate,
  })

  return response.data?.[0] || null
})
