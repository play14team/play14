"use server"

import { getAuthCookie } from "@/libs/auth"
import { revalidatePath } from "next/cache"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

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
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${eventId}/ticket-types`, {
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
        error: errorData.error?.message || `Failed to create ticket type (${response.status})`,
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
 * Update an existing ticket type
 */
export async function updateTicketType(
  ticketTypeId: string,
  data: Partial<TicketTypeData>
): Promise<ActionResult<TicketType>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/ticket-types/${ticketTypeId}`, {
      method: "PUT",
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
        error: errorData.error?.message || `Failed to update ticket type (${response.status})`,
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
 * Delete a ticket type (only if no tickets sold)
 */
export async function deleteTicketType(ticketTypeId: string): Promise<ActionResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/ticket-types/${ticketTypeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to delete ticket type (${response.status})`,
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

/**
 * Reorder ticket types for an event
 */
export async function reorderTicketTypes(
  eventId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  // Update sortOrder for each ticket type
  try {
    const updatePromises = orderedIds.map((documentId, index) =>
      fetch(`${STRAPI_URL}/api/ticket-types/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ data: { sortOrder: index } }),
      })
    )

    const results = await Promise.all(updatePromises)
    const failed = results.filter((r) => !r.ok)

    if (failed.length > 0) {
      return { success: false, error: "Failed to reorder some ticket types" }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
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
