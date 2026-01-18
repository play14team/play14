"use server"

import { strapiFetch, strapiFetchFormData } from "@/libs/strapi-client"

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
function normalizeLogoUrls(file: VenueLogo): VenueLogo {
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
  const formData = new FormData()
  formData.append("files", file)

  const result = await strapiFetchFormData<{ data: VenueLogo }>(
    "/admin/venues/:venueId/logo",
    { venueId },
    formData
  )

  if (!result.ok || !result.data) {
    return {
      success: false,
      error: result.error || "Failed to upload logo",
    }
  }

  return {
    success: true,
    data: normalizeLogoUrls(result.data.data),
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
  const result = await strapiFetch<{ data: VenueLogo }>(
    "/admin/venues/:venueId/logo/library",
    { venueId },
    {
      method: "PUT",
      body: { data: { fileId } },
    }
  )

  if (!result.ok || !result.data) {
    return {
      success: false,
      error: result.error || "Failed to set logo",
    }
  }

  return {
    success: true,
    data: normalizeLogoUrls(result.data.data),
  }
}

/**
 * Remove logo from venue
 * @param venueId Venue document ID
 */
export async function removeVenueLogo(venueId: string): Promise<LogoActionResult> {
  const result = await strapiFetch(
    "/admin/venues/:venueId/logo",
    { venueId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to remove logo",
    }
  }

  return { success: true }
}
