"use server"

import { strapiFetch } from "@/libs/strapi-client"

// Types for media links management
export interface MediaLink {
  id?: number
  url: string
  type: "Photos" | "Videos"
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Update event media links (external photo/video galleries)
 */
export async function updateEventMediaLinks(
  slug: string,
  media: MediaLink[]
): Promise<ActionResult<MediaLink[]>> {
  const result = await strapiFetch<StrapiDataResponse<MediaLink[]>>(
    "/events/:slug/media-links",
    { slug },
    {
      method: "PUT",
      body: { data: { media } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update media links",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}
