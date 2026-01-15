"use server"

import { strapiFetch } from "@/libs/strapi-client"
import type { BudgetLineItem, ActionResult } from "./budget.types"

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Get budget items for an event
 */
export async function getBudgetItems(
  eventDocumentId: string
): Promise<ActionResult<BudgetLineItem[]>> {
  const result = await strapiFetch<StrapiDataResponse<BudgetLineItem[]>>(
    "/events/:eventId/budget-items",
    { eventId: eventDocumentId },
    { method: "GET" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to fetch budget items",
    }
  }

  return {
    success: true,
    data: result.data?.data || [],
  }
}

/**
 * Create a budget item
 */
export async function createBudgetItem(
  eventDocumentId: string,
  item: Omit<BudgetLineItem, "id" | "documentId">
): Promise<ActionResult<BudgetLineItem>> {
  const result = await strapiFetch<StrapiDataResponse<BudgetLineItem>>(
    "/events/:eventId/budget-items",
    { eventId: eventDocumentId },
    {
      method: "POST",
      body: { data: item },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create budget item",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Update a budget item
 */
export async function updateBudgetItem(
  itemDocumentId: string,
  data: Partial<BudgetLineItem>
): Promise<ActionResult<BudgetLineItem>> {
  const result = await strapiFetch<StrapiDataResponse<BudgetLineItem>>(
    "/budget-items/:id",
    { id: itemDocumentId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update budget item",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Delete a budget item
 */
export async function deleteBudgetItem(itemDocumentId: string): Promise<ActionResult> {
  const result = await strapiFetch<StrapiDataResponse<{ success: boolean }>>(
    "/budget-items/:id",
    { id: itemDocumentId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete budget item",
    }
  }

  return {
    success: true,
  }
}

/**
 * Bulk update budget items
 */
export async function bulkUpdateBudgetItems(
  eventDocumentId: string,
  items: Array<Partial<BudgetLineItem> & { documentId?: string }>
): Promise<ActionResult<BudgetLineItem[]>> {
  const result = await strapiFetch<StrapiDataResponse<BudgetLineItem[]>>(
    "/events/:eventId/budget-items/bulk",
    { eventId: eventDocumentId },
    {
      method: "PUT",
      body: { data: { items } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to bulk update budget items",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}
