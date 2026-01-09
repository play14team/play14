"use server"

import { strapiFetch } from "@/libs/strapi-client"

// Types for discount code management
export interface DiscountCodeData {
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  maxUses?: number | null
  validFrom?: string | null
  validUntil?: string | null
  minOrderAmount?: number | null
  maxDiscountAmount?: number | null
  isActive?: boolean
  description?: string
}

export interface DiscountCode {
  documentId: string
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  maxUses?: number | null
  usedCount: number
  validFrom?: string | null
  validUntil?: string | null
  minOrderAmount?: number | null
  maxDiscountAmount?: number | null
  isActive: boolean
  description?: string
  createdAt: string
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
 * Get all discount codes for an event
 */
export async function getEventDiscountCodes(
  eventId: string
): Promise<ActionResult<DiscountCode[]>> {
  const result = await strapiFetch<StrapiDataResponse<DiscountCode[]>>(
    "/events/:eventId/discount-codes",
    { eventId },
    { cache: "no-store" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to fetch discount codes",
    }
  }

  return {
    success: true,
    data: result.data?.data || [],
  }
}

/**
 * Create a new discount code for an event
 */
export async function createDiscountCode(
  eventId: string,
  data: DiscountCodeData
): Promise<ActionResult<DiscountCode>> {
  const result = await strapiFetch<StrapiDataResponse<DiscountCode>>(
    "/events/:eventId/discount-codes",
    { eventId },
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create discount code",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Update an existing discount code
 */
export async function updateDiscountCode(
  discountCodeId: string,
  data: Partial<DiscountCodeData>
): Promise<ActionResult<DiscountCode>> {
  const result = await strapiFetch<StrapiDataResponse<DiscountCode>>(
    "/discount-codes/:discountCodeId",
    { discountCodeId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update discount code",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Delete a discount code (only if not used)
 */
export async function deleteDiscountCode(discountCodeId: string): Promise<ActionResult> {
  const result = await strapiFetch<void>(
    "/discount-codes/:discountCodeId",
    { discountCodeId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete discount code",
    }
  }

  return { success: true }
}

/**
 * Toggle discount code active status
 */
export async function toggleDiscountCodeActive(
  discountCodeId: string,
  isActive: boolean
): Promise<ActionResult<DiscountCode>> {
  return updateDiscountCode(discountCodeId, { isActive })
}
