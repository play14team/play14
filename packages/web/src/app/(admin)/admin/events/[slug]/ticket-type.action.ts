"use server"

import { strapiFetch } from "@/libs/strapi-client"

// Types for ticket type management
export interface TicketTypeData {
  name: string
  description?: string
  price: number
  currency: string
  capacity?: number | null
  validFrom?: string | null
  validUntil?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface TicketType {
  documentId: string
  name: string
  description?: string
  price: number
  currency: string
  capacity?: number | null
  soldCount: number
  validFrom?: string | null
  validUntil?: string | null
  sortOrder: number
  isActive: boolean
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a new ticket type for an event
 */
export async function createTicketType(
  eventId: string,
  data: TicketTypeData
): Promise<ActionResult<TicketType>> {
  const result = await strapiFetch<{ data: TicketType }>(
    "/events/:eventId/ticket-types",
    { eventId },
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create ticket type",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Update an existing ticket type
 */
export async function updateTicketType(
  ticketTypeId: string,
  data: Partial<TicketTypeData>
): Promise<ActionResult<TicketType>> {
  const result = await strapiFetch<{ data: TicketType }>(
    "/ticket-types/:ticketTypeId",
    { ticketTypeId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update ticket type",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Delete a ticket type (only if no tickets sold)
 */
export async function deleteTicketType(ticketTypeId: string): Promise<ActionResult> {
  const result = await strapiFetch(
    "/ticket-types/:ticketTypeId",
    { ticketTypeId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete ticket type",
    }
  }

  return { success: true }
}

/**
 * Reorder ticket types for an event
 */
export async function reorderTicketTypes(
  _eventId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  // Update sortOrder for each ticket type
  const updatePromises = orderedIds.map((documentId, index) =>
    strapiFetch(
      "/ticket-types/:documentId",
      { documentId },
      {
        method: "PUT",
        body: { data: { sortOrder: index } },
      }
    )
  )

  const results = await Promise.all(updatePromises)
  const failed = results.filter((r) => !r.ok)

  if (failed.length > 0) {
    return { success: false, error: "Failed to reorder some ticket types" }
  }

  return { success: true }
}

/**
 * Toggle ticket type active status
 */
export async function toggleTicketTypeActive(
  ticketTypeId: string,
  isActive: boolean
): Promise<ActionResult<TicketType>> {
  return updateTicketType(ticketTypeId, { isActive })
}
