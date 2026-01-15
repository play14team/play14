"use server"

import { strapiFetch, strapiFetchFormData } from "@/libs/strapi-client"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

/**
 * Normalize URL - convert relative URLs to absolute URLs using Strapi base URL
 */
function normalizeUrl(url: string | undefined): string {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  if (url.startsWith("/")) {
    return `${STRAPI_URL}${url}`
  }
  return url
}

/**
 * Normalize all URLs in a SponsorLogo object
 */
function normalizeLogoUrls(file: SponsorLogo): SponsorLogo {
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

export interface SponsorLogo {
  id: number
  name: string
  url: string
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
 * Upload a logo for a sponsor
 * @param sponsorId Sponsor document ID
 * @param file File to upload
 */
export async function uploadSponsorLogo(
  sponsorId: string,
  file: File
): Promise<LogoActionResult<SponsorLogo>> {
  const formData = new FormData()
  formData.append("files", file)

  const result = await strapiFetchFormData<{ data: SponsorLogo }>(
    "/sponsors/admin/:sponsorId/logo",
    { sponsorId },
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
 * Set an existing media library image as sponsor logo
 * @param sponsorId Sponsor document ID
 * @param fileId ID of the file from media library
 */
export async function setSponsorLogoFromLibrary(
  sponsorId: string,
  fileId: number
): Promise<LogoActionResult<SponsorLogo>> {
  const result = await strapiFetch<{ data: SponsorLogo }>(
    "/sponsors/admin/:sponsorId/logo/library",
    { sponsorId },
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
 * Remove logo from sponsor
 * @param sponsorId Sponsor document ID
 */
export async function removeSponsorLogo(
  sponsorId: string
): Promise<LogoActionResult> {
  const result = await strapiFetch(
    "/sponsors/admin/:sponsorId/logo",
    { sponsorId },
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
