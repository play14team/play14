"use server"

import {
  strapiFetch,
  strapiFetchFormData,
  strapiFetchWithQuery,
} from "@/libs/strapi-client"

// Types for sponsor management
export interface SponsorLogo {
  id: number
  url: string
  width?: number
  height?: number
  formats?: {
    thumbnail?: { url: string; width: number; height: number }
    small?: { url: string; width: number; height: number }
  }
}

export interface Sponsor {
  documentId: string
  name: string
  url?: string
  logo?: SponsorLogo | null
}

export interface Sponsorship {
  id?: number
  category: string
  sponsors: Sponsor[]
}

export interface SponsorActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get all available sponsors for selection
 */
export async function getAvailableSponsors(): Promise<SponsorActionResult<Sponsor[]>> {
  // Fetch all sponsors with pagination disabled (limit -1 not supported, use large number)
  const result = await strapiFetchWithQuery<{ data: Sponsor[] }>(
    "/sponsors",
    {},
    {
      "sort": "name:asc",
      "populate": "logo",
      "pagination[pageSize]": "1000",
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to fetch sponsors",
    }
  }

  return {
    success: true,
    data: result.data?.data || [],
  }
}

/**
 * Create a new sponsor
 */
export async function createSponsor(data: {
  name: string
  url?: string
}): Promise<SponsorActionResult<Sponsor>> {
  const result = await strapiFetch<{ data: Sponsor }>(
    "/sponsors",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create sponsor",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Upload logo for a sponsor
 */
export async function uploadSponsorLogo(
  sponsorId: string,
  file: File
): Promise<SponsorActionResult<SponsorLogo>> {
  // First upload the file
  const formData = new FormData()
  formData.append("files", file)
  formData.append("refId", sponsorId)
  formData.append("ref", "api::sponsor.sponsor")
  formData.append("field", "logo")

  // Note: /upload doesn't have user input in the path, so it's safe
  // The sponsorId is in the form body, validated by Strapi server-side
  const result = await strapiFetchFormData<Array<{
    id: number
    url: string
    width?: number
    height?: number
    formats?: SponsorLogo["formats"]
  }>>(
    "/upload",
    {},
    formData
  )

  if (!result.ok || !result.data || result.data.length === 0) {
    return {
      success: false,
      error: result.error || "Failed to upload logo",
    }
  }

  const uploadedFile = result.data[0]
  return {
    success: true,
    data: {
      id: uploadedFile.id,
      url: uploadedFile.url,
      width: uploadedFile.width,
      height: uploadedFile.height,
      formats: uploadedFile.formats,
    },
  }
}

/**
 * Update event sponsorships
 */
export async function updateEventSponsorships(
  slug: string,
  sponsorships: Sponsorship[]
): Promise<SponsorActionResult<Sponsorship[]>> {
  const result = await strapiFetch<{ data: Sponsorship[] }>(
    "/events/:slug/sponsorships",
    { slug },
    {
      method: "PUT",
      body: { data: { sponsorships } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update sponsorships",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}
