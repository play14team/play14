"use server"

import { getAuthCookie } from "@/libs/auth"
import type { UploadFile } from "@/models/strapi"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// ============================================================================
// TYPES
// ============================================================================

export interface ClaimPlayer {
  documentId: string
  name: string
  slug: string
  position?: string
  avatar?: UploadFile
}

export interface ClaimEvent {
  documentId: string
  name: string
  slug: string
  start: string
  end: string
  defaultImage?: UploadFile
  location?: {
    name: string
    slug: string
  }
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
  player: ClaimPlayer
  event: ClaimEvent
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
// GET PENDING CLAIMS FOR MY EVENTS
// ============================================================================

export async function getPendingAttendanceClaimsForMyEvents(): Promise<ClaimsResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/attendance-claims/for-my-events`, {
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
    console.error("[AttendanceClaims] Failed to fetch pending claims:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch claims",
    }
  }
}

// ============================================================================
// APPROVE CLAIM
// ============================================================================

export async function approveAttendanceClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/attendance-claims/${claimId}/approve`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            adminNotes: adminNotes || undefined,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to approve claim: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      claim: data.data,
    }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to approve claim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve claim",
    }
  }
}

// ============================================================================
// REJECT CLAIM
// ============================================================================

export async function rejectAttendanceClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/attendance-claims/${claimId}/reject`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            adminNotes: adminNotes || undefined,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to reject claim: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      claim: data.data,
    }
  } catch (error) {
    console.error("[AttendanceClaims] Failed to reject claim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject claim",
    }
  }
}
