"use server"

import { strapiFetch } from "@/libs/strapi-client"
import type { UploadFile } from "@/models/strapi"

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

interface StrapiDataResponse<T> {
  data: T
}

// ============================================================================
// GET PENDING CLAIMS FOR MY EVENTS
// ============================================================================

export async function getPendingAttendanceClaimsForMyEvents(): Promise<ClaimsResponse> {
  const result = await strapiFetch<StrapiDataResponse<AttendanceClaim[]>>(
    "/attendance-claims/for-my-events",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[AttendanceClaims] Failed to fetch pending claims:", result.error)
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

export async function approveAttendanceClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const result = await strapiFetch<StrapiDataResponse<AttendanceClaim>>(
    "/attendance-claims/:claimId/approve",
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
    console.error("[AttendanceClaims] Failed to approve claim:", result.error)
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

export async function rejectAttendanceClaim(
  claimId: string,
  adminNotes?: string
): Promise<ClaimActionResponse> {
  const result = await strapiFetch<StrapiDataResponse<AttendanceClaim>>(
    "/attendance-claims/:claimId/reject",
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
    console.error("[AttendanceClaims] Failed to reject claim:", result.error)
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
