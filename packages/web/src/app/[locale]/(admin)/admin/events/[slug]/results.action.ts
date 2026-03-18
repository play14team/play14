"use server"

import { strapiFetch } from "@/libs/strapi-client"
import { revalidateEventPages } from "./event-edit.action"
import type { ActionResult, ResultLineItem } from "./results.types"

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Get result items for an event
 */
export async function getResultItems(
  eventDocumentId: string
): Promise<ActionResult<ResultLineItem[]>> {
  const result = await strapiFetch<StrapiDataResponse<ResultLineItem[]>>(
    "/admin/events/:eventId/result-items",
    { eventId: eventDocumentId },
    { method: "GET" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to fetch result items",
    }
  }

  return {
    success: true,
    data: result.data?.data || [],
  }
}

/**
 * Create a result item
 */
export async function createResultItem(
  eventDocumentId: string,
  item: Omit<ResultLineItem, "id" | "documentId">,
  slug?: string
): Promise<ActionResult<ResultLineItem>> {
  const result = await strapiFetch<StrapiDataResponse<ResultLineItem>>(
    "/admin/events/:eventId/result-items",
    { eventId: eventDocumentId },
    {
      method: "POST",
      body: { data: item },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create result item",
    }
  }

  // Revalidate public pages after successful creation
  if (slug) {
    await revalidateEventPages(slug)
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Update a result item
 */
export async function updateResultItem(
  itemDocumentId: string,
  data: Partial<ResultLineItem>,
  slug?: string
): Promise<ActionResult<ResultLineItem>> {
  const result = await strapiFetch<StrapiDataResponse<ResultLineItem>>(
    "/admin/result-items/:id",
    { id: itemDocumentId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update result item",
    }
  }

  // Revalidate public pages after successful update
  if (slug) {
    await revalidateEventPages(slug)
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Delete a result item
 */
export async function deleteResultItem(
  itemDocumentId: string,
  slug?: string
): Promise<ActionResult> {
  const result = await strapiFetch<StrapiDataResponse<{ success: boolean }>>(
    "/admin/result-items/:id",
    { id: itemDocumentId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete result item",
    }
  }

  // Revalidate public pages after successful deletion
  if (slug) {
    await revalidateEventPages(slug)
  }

  return {
    success: true,
  }
}

/**
 * Bulk update result items
 */
export async function bulkUpdateResultItems(
  eventDocumentId: string,
  items: Array<Partial<ResultLineItem> & { documentId?: string }>,
  slug?: string
): Promise<ActionResult<ResultLineItem[]>> {
  const result = await strapiFetch<StrapiDataResponse<ResultLineItem[]>>(
    "/admin/events/:eventId/result-items/bulk",
    { eventId: eventDocumentId },
    {
      method: "PUT",
      body: { data: { items } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to bulk update result items",
    }
  }

  // Revalidate public pages after successful bulk update
  if (slug) {
    await revalidateEventPages(slug)
  }

  return {
    success: true,
    data: result.data?.data,
  }
}
