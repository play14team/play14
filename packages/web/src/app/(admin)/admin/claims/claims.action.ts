"use server"

import { getAuthCookie } from "@/libs/auth"
import type { Player, UploadFile } from "@/models/strapi"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// ============================================================================
// TYPES
// ============================================================================

export interface ClaimUser {
  id: number
  username: string
  email: string
  provider: string
}

export interface ClaimPlayer {
  documentId: string
  name: string
  slug: string
  position?: string
  avatar?: UploadFile
}

export interface PlayerClaim {
  id: number
  documentId: string
  claimStatus: "pending" | "approved" | "rejected"
  reason: string
  adminNotes?: string
  processedAt?: string
  createdAt: string
  updatedAt: string
  user: ClaimUser
  player: ClaimPlayer
}

export interface ClaimsResponse {
  success: boolean
  claims?: PlayerClaim[]
  error?: string
}

export interface ClaimActionResponse {
  success: boolean
  claim?: PlayerClaim
  error?: string
}

// ============================================================================
// FETCH PENDING CLAIMS
// ============================================================================

export async function getPendingClaims(): Promise<ClaimsResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/player-claims/pending`, {
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
    console.error("[Claims] Failed to fetch pending claims:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch claims",
    }
  }
}

// ============================================================================
// APPROVE CLAIM
// ============================================================================

export async function approveClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/player-claims/${claimId}/approve`,
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
    console.error("[Claims] Failed to approve claim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve claim",
    }
  }
}

// ============================================================================
// REJECT CLAIM
// ============================================================================

export async function rejectClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/player-claims/${claimId}/reject`,
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
    console.error("[Claims] Failed to reject claim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject claim",
    }
  }
}
