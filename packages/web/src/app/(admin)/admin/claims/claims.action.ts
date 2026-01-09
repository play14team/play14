"use server"

import { strapiFetch } from "@/libs/strapi-client"
import type { UploadFile } from "@/models/strapi"

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

interface StrapiDataResponse<T> {
  data: T
}

// ============================================================================
// FETCH PENDING CLAIMS
// ============================================================================

export async function getPendingClaims(): Promise<ClaimsResponse> {
  const result = await strapiFetch<StrapiDataResponse<PlayerClaim[]>>(
    "/player-claims/pending",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[Claims] Failed to fetch pending claims:", result.error)
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
// APPROVE CLAIM
// ============================================================================

export async function approveClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const result = await strapiFetch<StrapiDataResponse<PlayerClaim>>(
    "/player-claims/:claimId/approve",
    { claimId },
    {
      method: "PUT",
      body: {
        data: {
          adminNotes: adminNotes || undefined,
        },
      },
    }
  )

  if (!result.ok) {
    console.error("[Claims] Failed to approve claim:", result.error)
    return {
      success: false,
      error: result.error || "Failed to approve claim",
    }
  }

  return {
    success: true,
    claim: result.data?.data,
  }
}

// ============================================================================
// REJECT CLAIM
// ============================================================================

export async function rejectClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const result = await strapiFetch<StrapiDataResponse<PlayerClaim>>(
    "/player-claims/:claimId/reject",
    { claimId },
    {
      method: "PUT",
      body: {
        data: {
          adminNotes: adminNotes || undefined,
        },
      },
    }
  )

  if (!result.ok) {
    console.error("[Claims] Failed to reject claim:", result.error)
    return {
      success: false,
      error: result.error || "Failed to reject claim",
    }
  }

  return {
    success: true,
    claim: result.data?.data,
  }
}
