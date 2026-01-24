"use server"

import { strapiFetch, strapiFetchFormData, strapiFetchWithQuery } from "@/libs/strapi-client"
import { revalidatePath } from "next/cache"

/**
 * Revalidate all public pages that display liked items data
 */
function revalidateLikedItemPages() {
  revalidatePath("/likes")
}

export interface ContributorInfo {
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

export interface LikedItemListItem {
  documentId: string
  name: string
  description: string | null
  url: string
  image: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  } | null
  contributors: ContributorInfo[]
  contributorsCount: number
}

export interface LikedItemsListResponse {
  data: LikedItemListItem[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface LikedItemForEdit {
  documentId: string
  name: string
  description: string | null
  url: string
  image: {
    id: number
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
      medium?: { url: string }
      large?: { url: string }
    }
  } | null
  contributors: ContributorInfo[]
}

const emptyResponse: LikedItemsListResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
}

/**
 * Get list of liked items with optional search
 */
export async function getLikedItems(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<LikedItemsListResponse> {
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (search) {
    queryParams.search = search
  }

  const result = await strapiFetchWithQuery<LikedItemsListResponse>(
    "/admin/liked-items",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error(`[LikedItems] Failed to fetch liked items: ${result.status} - ${result.error}`)
    return emptyResponse
  }

  return result.data || emptyResponse
}

/**
 * Get a liked item for editing
 */
export async function getLikedItemForEdit(itemId: string): Promise<LikedItemForEdit | null> {
  const result = await strapiFetch<{ data: LikedItemForEdit }>(
    "/admin/liked-items/:itemId",
    { itemId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data
}

export interface LikedItemCreateData {
  name: string
  description?: string
  url: string
  contributorIds?: string[]
}

/**
 * Create a new liked item
 */
export async function createLikedItem(
  data: LikedItemCreateData
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  const result = await strapiFetch<{ data: { documentId: string } }>(
    "/admin/liked-items",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create liked item",
    }
  }

  revalidateLikedItemPages()
  return { success: true, documentId: result.data?.data.documentId }
}

export interface LikedItemUpdateData {
  name?: string
  description?: string
  url?: string
  contributorIds?: string[]
}

/**
 * Update a liked item
 */
export async function updateLikedItem(
  itemId: string,
  data: LikedItemUpdateData
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/liked-items/:itemId",
    { itemId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update liked item",
    }
  }

  revalidateLikedItemPages()
  return { success: true }
}

/**
 * Delete a liked item
 */
export async function deleteLikedItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/liked-items/:itemId",
    { itemId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete liked item",
    }
  }

  revalidateLikedItemPages()
  return { success: true }
}

/**
 * Upload an image for a liked item
 */
export async function uploadLikedItemImage(
  itemId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; imageUrl?: string }> {
  const result = await strapiFetchFormData<{ data: { url: string } }>(
    "/admin/liked-items/:itemId/image",
    { itemId },
    formData
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to upload image",
    }
  }

  revalidateLikedItemPages()
  return { success: true, imageUrl: result.data?.data?.url }
}

/**
 * Set an image from the media library for a liked item
 */
export async function setLikedItemImageFromLibrary(
  itemId: string,
  fileId: number
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/liked-items/:itemId/image/library",
    { itemId },
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

  revalidateLikedItemPages()
  return { success: true }
}

/**
 * Remove the image from a liked item
 */
export async function removeLikedItemImage(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/liked-items/:itemId/image",
    { itemId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to remove image",
    }
  }

  revalidateLikedItemPages()
  return { success: true }
}
