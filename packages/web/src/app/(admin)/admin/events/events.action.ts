"use server"

import { strapiFetch } from "@/libs/strapi-client"
import type { UploadFile } from "@/models/strapi"
import {
  getClaimableEvents as getClaimableEventsOriginal,
  searchClaimableEvents as searchClaimableEventsOriginal,
  getMyAttendanceClaims as getMyAttendanceClaimsOriginal,
  submitAttendanceClaim as submitAttendanceClaimOriginal,
  cancelAttendanceClaim as cancelAttendanceClaimOriginal,
} from "../claim-attendance/claim-attendance.action"

// ============================================================================
// TYPES
// ============================================================================

export interface MyEvent {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  eventStatus: string
  isPublished: boolean
  isHost: boolean
  isMentor: boolean
  location: {
    name: string
    country: string
  } | null
  defaultImage?: UploadFile | null
}

// Re-export types from claim-attendance
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
// MY EVENTS (ORGANIZED)
// ============================================================================

/**
 * Get events for the current organizer
 * - Hosts see events they host
 * - Mentors see events they mentor
 * - Founders see all events
 */
export async function getMyEvents(): Promise<MyEvent[]> {
  const result = await strapiFetch<{ data: MyEvent[] }>(
    "/admin/events/my-events",
    {},
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return []
  return result.data.data || []
}

// ============================================================================
// WRAPPER FUNCTIONS FOR CLAIM-ATTENDANCE ACTIONS
// (use server files can only export async functions, not re-exports)
// ============================================================================

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
  const result = await strapiFetch<{ data: AttendedEvent[] }>(
    "/admin/players/me/attended-events",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[Events] Failed to fetch attended events:", result.error)
    return {
      success: false,
      error: result.error || "Failed to fetch attended events",
    }
  }

  return {
    success: true,
    events: result.data?.data || [],
  }
}
