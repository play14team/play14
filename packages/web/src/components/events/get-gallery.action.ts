"use server"

import { restQuery } from "@/libs/strapi-client"
import { imageFields } from "@/libs/strapi-populate"

/**
 * Populate config for gallery - only fields needed for the gallery wall
 */
const eventGalleryPopulate = {
  defaultImage: { fields: imageFields },
  images: { fields: imageFields },
  media: { fields: ["id", "url", "mediaType"] },
  location: { fields: ["name", "country"] },
}

export interface GalleryEvent {
  slug: string
  name: string
  start: string
  defaultImage?: { url: string; width?: number; height?: number; name?: string }
  images?: Array<{ url: string; width?: number; height?: number; name?: string }>
  media?: Array<{ id: string; url: string; mediaType: string }>
  location?: { name: string; country: string }
}

/**
 * Fetch all events that have visual content (uploaded images or media links)
 * for the gallery wall page.
 */
export async function getGalleryEvents(): Promise<GalleryEvent[]> {
  const allEvents: GalleryEvent[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<GalleryEvent[]>("events", {
      sort: ["start:desc"],
      pagination: { page, pageSize },
      populate: eventGalleryPopulate,
    })
    const events = response.data || []
    allEvents.push(...events)
    if (events.length < pageSize) break
    page++
  }

  // Only return events that have visual content
  return allEvents.filter(
    (e) => (e.images && e.images.length > 0) || (e.media && e.media.length > 0)
  )
}
