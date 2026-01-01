"use server"

import { getAuthCookie } from "@/libs/auth"
import type { UploadFile } from "@/models/strapi"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// ============================================================================
// TYPES
// ============================================================================

export interface EventLocation {
  name: string
  slug: string
}

export interface ClaimableEvent {
  documentId: string
  name: string
  slug: string
  start: string
  end: string
  defaultImage?: UploadFile
  location?: EventLocation
}

export interface AttendanceClaim {
  id: number
  documentId: string
  claimStatus: "pending" | "approved" | "rejected"
  reason: string
  adminNotes?: string
  processedAt?: string
  createdAt: string
  updatedAt: string
  event: ClaimableEvent
}

export interface EventsResponse {
  success: boolean
  events?: ClaimableEvent[]
  error?: string
}

export interface ClaimsResponse {
  success: boolean
  claims?: AttendanceClaim[]
  error?: string
}

export interface ClaimActionResponse {
  success: boolean
  claim?: AttendanceClaim
  error?: string
}

// ============================================================================
// GET CLAIMABLE EVENTS
// ============================================================================

export async function getClaimableEvents(): Promise<EventsResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/attendance-claims/events`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to fetch events: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      events: data.data?.events || [],
    }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to fetch claimable events:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch events",
    }
  }
}

// ============================================================================
// SEARCH EVENTS
// ============================================================================

export async function searchClaimableEvents(query: string): Promise<EventsResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/attendance-claims/events/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to search events: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      events: data.data?.events || [],
    }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to search events:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search events",
    }
  }
}

// ============================================================================
// GET MY CLAIMS
// ============================================================================

export async function getMyAttendanceClaims(): Promise<ClaimsResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/attendance-claims/me`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to fetch claims: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      claims: data.data || [],
    }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to fetch my claims:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch claims",
    }
  }
}

// ============================================================================
// SUBMIT CLAIM
// ============================================================================

export async function submitAttendanceClaim(
  eventId: string,
  reason: string
): Promise<ClaimActionResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/attendance-claims`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          eventId,
          reason,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to submit claim: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      claim: data.data,
    }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to submit claim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit claim",
    }
  }
}

// ============================================================================
// CANCEL CLAIM
// ============================================================================

export async function cancelAttendanceClaim(claimId: string): Promise<ClaimActionResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/attendance-claims/${claimId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to cancel claim: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to cancel claim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel claim",
    }
  }
}
