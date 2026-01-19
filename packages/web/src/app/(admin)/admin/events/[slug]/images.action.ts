"use server"

import {
  getStrapiClient,
  strapiFetch,
  strapiFetchFormData,
  strapiFetchWithQuery,
} from "@/libs/strapi-client"

// STRAPI_URL kept for URL normalization (converting relative URLs to absolute)
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
 * Normalize all URLs in an EventImage object
 */
function normalizeEventImageUrls(file: EventImage): EventImage {
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

// Re-export types for convenience
export interface EventImage {
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

export interface MediaFolder {
  id: number
  documentId?: string
  name: string
  path: string
  pathId: number
  parent?: { id: number; name: string } | null
  children?: { count: number }
  files?: { count: number }
}

export interface ImageActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Upload an image for an event (default image or gallery)
 * @param slug Event slug
 * @param file File to upload
 * @param field Field to set image on ("defaultImage" or "images")
 */
export async function uploadEventImage(
  slug: string,
  file: File,
  field: "defaultImage" | "images"
): Promise<ImageActionResult<EventImage>> {
  const formData = new FormData()
  formData.append("files", file)
  formData.append("field", field)

  const result = await strapiFetchFormData<StrapiDataResponse<EventImage>>(
    "/admin/events/:slug/images",
    { slug },
    formData
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to upload image",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Set an existing media library image as event image
 * @param slug Event slug
 * @param fileId ID of the file from media library
 * @param field Field to set image on ("defaultImage" or "images")
 */
export async function setEventImageFromLibrary(
  slug: string,
  fileId: number,
  field: "defaultImage" | "images"
): Promise<ImageActionResult<EventImage>> {
  const result = await strapiFetch<StrapiDataResponse<EventImage>>(
    "/admin/events/:slug/images/:field",
    { slug, field },
    {
      method: "PUT",
      body: { data: { fileId } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to set image",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Remove an image from event
 * @param slug Event slug
 * @param fileId ID of the file to remove
 * @param field Field to remove image from ("defaultImage" or "images")
 */
export async function removeEventImage(
  slug: string,
  fileId: number,
  field: "defaultImage" | "images"
): Promise<ImageActionResult> {
  const result = await strapiFetch<void>(
    "/admin/events/:slug/images/:field/:fileId",
    { slug, field, fileId: String(fileId) },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to remove image",
    }
  }

  return { success: true }
}

/**
 * List files from Strapi media library
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @param search Optional search query
 * @param folderId Optional folder ID to filter by (null for root level)
 */
export async function listMediaLibraryFiles(
  page = 1,
  pageSize = 24,
  search?: string,
  folderId?: number | null
): Promise<ImageActionResult<{ files: EventImage[]; total: number }>> {
  // Strapi 5 upload/files endpoint uses start/limit instead of page/pageSize
  const start = (page - 1) * pageSize
  const params = new URLSearchParams({
    start: start.toString(),
    limit: pageSize.toString(),
    "filters[mime][$containsi]": "image",
    sort: "createdAt:desc",
  })

  if (search) {
    params.append("filters[name][$containsi]", search)
  }

  // Filter by folder - use $null for root level files
  if (folderId !== undefined) {
    if (folderId === null) {
      params.append("filters[folder][$null]", "true")
    } else {
      params.append("filters[folder]", folderId.toString())
    }
  }

  // Use custom media-files endpoint that supports folder filtering
  // Note: This endpoint returns an array directly, not wrapped in { data: ... }
  try {
    const client = await getStrapiClient()
    const response = await client.fetch(`/admin/media-files?${params}`)

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      return {
        success: false,
        error: errorData?.error?.message || `Failed to list files (${response.status})`,
      }
    }

    // Strapi upload API returns an array directly
    const files = (await response.json()) as EventImage[]
    // Normalize URLs so they work in the client
    const normalizedFiles = Array.isArray(files) ? files.map(normalizeEventImageUrls) : []
    return {
      success: true,
      data: {
        files: normalizedFiles,
        total: normalizedFiles.length,
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
 * List folders from Strapi media library
 * @param parentId Optional parent folder ID (null/undefined for root level)
 */
export async function listMediaLibraryFolders(
  parentId?: number | null
): Promise<ImageActionResult<{ folders: MediaFolder[] }>> {
  const params = new URLSearchParams()

  // Filter by parent folder
  if (parentId === null || parentId === undefined) {
    params.append("filters[parent][$null]", "true")
  } else {
    params.append("filters[parent]", parentId.toString())
  }

  // Use custom media-folders endpoint (Strapi upload plugin doesn't expose folders via content-api)
  const result = await strapiFetchWithQuery<StrapiDataResponse<MediaFolder[]>>(
    "/admin/media-folders",
    {},
    params
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to list folders",
    }
  }

  const folders = result.data?.data || []
  return {
    success: true,
    data: {
      folders: Array.isArray(folders) ? folders : [],
    },
  }
}
