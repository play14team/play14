"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

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
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Fetch all sponsors with pagination disabled (limit -1 not supported, use large number)
    const response = await fetch(
      `${STRAPI_URL}/api/sponsors?sort=name:asc&populate=logo&pagination[pageSize]=1000`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to fetch sponsors (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: responseData.data || [],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Create a new sponsor
 */
export async function createSponsor(data: {
  name: string
  url?: string
}): Promise<SponsorActionResult<Sponsor>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/sponsors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to create sponsor (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: responseData.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Upload logo for a sponsor
 */
export async function uploadSponsorLogo(
  sponsorId: string,
  file: File
): Promise<SponsorActionResult<SponsorLogo>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // First upload the file
    const formData = new FormData()
    formData.append("files", file)
    formData.append("refId", sponsorId)
    formData.append("ref", "api::sponsor.sponsor")
    formData.append("field", "logo")

    const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to upload logo (${uploadResponse.status})`,
      }
    }

    const uploadedFiles = await uploadResponse.json()
    const uploadedFile = uploadedFiles[0]

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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Update event sponsorships
 */
export async function updateEventSponsorships(
  slug: string,
  sponsorships: Sponsorship[]
): Promise<SponsorActionResult<Sponsorship[]>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${slug}/sponsorships`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: { sponsorships } }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to update sponsorships (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: responseData.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
