"use server"

import { getAuthCookie } from "@/libs/auth"
import type { UploadFile } from "@/models/strapi"
import { getMyEvents as getMyEventsOriginal } from "./my-events.action"
import {
  getClaimableEvents as getClaimableEventsOriginal,
  searchClaimableEvents as searchClaimableEventsOriginal,
  getMyAttendanceClaims as getMyAttendanceClaimsOriginal,
  submitAttendanceClaim as submitAttendanceClaimOriginal,
  cancelAttendanceClaim as cancelAttendanceClaimOriginal,
} from "../claim-attendance/claim-attendance.action"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// ============================================================================
// TYPES
// ============================================================================

// Re-export types (types are allowed in "use server" files)
export type { MyEvent } from "./my-events.action"
export type {
  EventLocation,
  ClaimableEvent,
  AttendanceClaim,
  EventsResponse,
  ClaimsResponse,
  ClaimActionResponse,
} from "../claim-attendance/claim-attendance.action"

// New type for attended events
export interface AttendedEvent {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  eventStatus: string
  defaultImage?: UploadFile
  location?: {
    name: string
    country: string
    slug?: string
  }
  attendanceSource: "ticket" | "claim" | "direct"
}

export interface AttendedEventsResponse {
  success: boolean
  events?: AttendedEvent[]
  error?: string
}

// ============================================================================
// WRAPPER FUNCTIONS FOR EXISTING ACTIONS
// (use server files can only export async functions, not re-exports)
// ============================================================================

/**
 * Get events organized by the current user
 */
export async function getMyEvents() {
  return getMyEventsOriginal()
}

/**
 * Get claimable events (past events)
 */
export async function getClaimableEvents() {
  return getClaimableEventsOriginal()
}

/**
 * Search claimable events by query
 */
export async function searchClaimableEvents(query: string) {
  return searchClaimableEventsOriginal(query)
}

/**
 * Get attendance claims for the current user
 */
export async function getMyAttendanceClaims() {
  return getMyAttendanceClaimsOriginal()
}

/**
 * Submit an attendance claim for an event
 */
export async function submitAttendanceClaim(eventId: string, reason: string) {
  return submitAttendanceClaimOriginal(eventId, reason)
}

/**
 * Cancel an attendance claim
 */
export async function cancelAttendanceClaim(claimId: string) {
  return cancelAttendanceClaimOriginal(claimId)
}

// ============================================================================
// GET ATTENDED EVENTS
// ============================================================================

/**
 * Get events the current user has attended (via tickets or approved claims)
 */
export async function getMyAttendedEvents(): Promise<AttendedEventsResponse> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/players/me/attended-events`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to fetch attended events: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      events: data.data || [],
    }
  } catch (error) {
    console.error("[Events] Failed to fetch attended events:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch attended events",
    }
  }
}
