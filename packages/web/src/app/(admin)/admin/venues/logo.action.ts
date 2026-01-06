"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

/**
 * Normalize URL - convert relative URLs to absolute URLs using Strapi base URL
 * This runs on the server where STRAPI_API_URL is available
 */
function normalizeUrl(url: string | undefined): string {
  if (!url) return ""
  // If URL is already absolute, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  // If URL is relative, prefix with Strapi URL
  if (url.startsWith("/")) {
    return `${STRAPI_URL}${url}`
  }
  return url
}

/**
 * Normalize all URLs in a VenueLogo object
 */
function normalizeLogoUrls(file: any): any {
  return {
    ...file,
    url: normalizeUrl(file.url),
    formats: file.formats
      ? {
          thumbnail: file.formats.thumbnail
            ? { ...file.formats.thumbnail, url: normalizeUrl(file.formats.thumbnail.url) }
            : undefined,
          small: file.formats.small
            ? { ...file.formats.small, url: normalizeUrl(file.formats.small.url) }
            : undefined,
          medium: file.formats.medium
            ? { ...file.formats.medium, url: normalizeUrl(file.formats.medium.url) }
            : undefined,
          large: file.formats.large
            ? { ...file.formats.large, url: normalizeUrl(file.formats.large.url) }
            : undefined,
        }
      : undefined,
  }
}

export interface VenueLogo {
  id: number
  documentId?: string
  name: string
  url: string
  mime?: string
  ext?: string
  width?: number
  height?: number
  formats?: {
    thumbnail?: { url: string; width: number; height: number }
    small?: { url: string; width: number; height: number }
    medium?: { url: string; width: number; height: number }
    large?: { url: string; width: number; height: number }
  }
}

export interface LogoActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Upload a logo for a venue
 * @param venueId Venue document ID
 * @param file File to upload
 */
export async function uploadVenueLogo(
  venueId: string,
  file: File
): Promise<LogoActionResult<VenueLogo>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const formData = new FormData()
    formData.append("files", file)

    const response = await fetch(`${STRAPI_URL}/api/venues/admin/${venueId}/logo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to upload logo (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: normalizeLogoUrls(responseData.data),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Set an existing media library image as venue logo
 * @param venueId Venue document ID
 * @param fileId ID of the file from media library
 */
export async function setVenueLogoFromLibrary(
  venueId: string,
  fileId: number
): Promise<LogoActionResult<VenueLogo>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/venues/admin/${venueId}/logo/library`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: { fileId } }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to set logo (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: normalizeLogoUrls(responseData.data),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Remove logo from venue
 * @param venueId Venue document ID
 */
export async function removeVenueLogo(venueId: string): Promise<LogoActionResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/venues/admin/${venueId}/logo`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to remove logo (${response.status})`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
