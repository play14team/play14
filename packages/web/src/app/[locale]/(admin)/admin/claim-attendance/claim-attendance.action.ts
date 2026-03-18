"use server"

import { strapiFetch, strapiFetchWithQuery, validatePathSegment } from "@/libs/strapi-client"
import type { UploadFile } from "@/models/strapi"

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

interface StrapiDataResponse<T> {
  data: T
}

interface EventsDataResponse {
  data: {
    events: ClaimableEvent[]
  }
}

// ============================================================================
// GET CLAIMABLE EVENTS
// ============================================================================

export async function getClaimableEvents(): Promise<EventsResponse> {
  const result = await strapiFetch<EventsDataResponse>(
    "/admin/attendance-claims/events",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[AttendanceClaims] Failed to fetch claimable events:", result.error)
    return {
      success: false,
      error: result.error || "Failed to fetch events",
    }
  }

  return {
    success: true,
    events: result.data?.data?.events || [],
  }
}

// ============================================================================
// SEARCH EVENTS
// ============================================================================

export async function searchClaimableEvents(query: string): Promise<EventsResponse> {
  // Note: query is validated as a search string, not a path segment
  // It's passed as a query parameter, so encodeURIComponent is sufficient
  const result = await strapiFetchWithQuery<EventsDataResponse>(
    "/admin/attendance-claims/events/search",
    {},
    { query },
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[AttendanceClaims] Failed to search events:", result.error)
    return {
      success: false,
      error: result.error || "Failed to search events",
    }
  }

  return {
    success: true,
    events: result.data?.data?.events || [],
  }
}

// ============================================================================
// GET MY CLAIMS
// ============================================================================

export async function getMyAttendanceClaims(): Promise<ClaimsResponse> {
  const result = await strapiFetch<StrapiDataResponse<AttendanceClaim[]>>(
    "/admin/attendance-claims/me",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[AttendanceClaims] Failed to fetch my claims:", result.error)
    return {
      success: false,
      error: result.error || "Failed to fetch claims",
    }
  }

  return {
    success: true,
    claims: result.data?.data || [],
  }
}

// ============================================================================
// SUBMIT CLAIM
// ============================================================================

export async function submitAttendanceClaim(
  eventId: string,
  reason: string
): Promise<ClaimActionResponse> {
  // Validate eventId before using in request body (defense in depth)
  try {
    validatePathSegment(eventId, "eventId")
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid event ID",
    }
  }

  const result = await strapiFetch<StrapiDataResponse<AttendanceClaim>>(
    "/admin/attendance-claims",
    {},
    {
      method: "POST",
      body: {
        data: {
          eventId,
          reason,
        },
      },
    }
  )

  if (!result.ok) {
    console.error("[AttendanceClaims] Failed to submit claim:", result.error)
    return {
      success: false,
      error: result.error || "Failed to submit claim",
    }
  }

  return {
    success: true,
    claim: result.data?.data,
  }
}

// ============================================================================
// CANCEL CLAIM
// ============================================================================

export async function cancelAttendanceClaim(claimId: string): Promise<ClaimActionResponse> {
  const result = await strapiFetch<void>(
    "/admin/attendance-claims/:claimId",
    { claimId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    console.error("[AttendanceClaims] Failed to cancel claim:", result.error)
    return {
      success: false,
      error: result.error || "Failed to cancel claim",
    }
  }

  return { success: true }
}
