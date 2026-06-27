"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

export interface AttendeeInfo {
  firstName: string
  lastName: string
  email: string
  tshirtSize?: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL" | "none"
  foodPreferences?: string
  photoConsent: boolean
  photoConsentTimestamp?: string
}

export interface Participant {
  documentId: string
  ticketCode: string
  ticketStatus: "valid" | "used" | "cancelled" | "refunded"
  attendeeName?: string
  attendeeEmail?: string
  attendeeInfo?: AttendeeInfo
  checkedInAt?: string
  ticketType?: {
    documentId: string
    name: string
  }
  order?: {
    documentId: string
    orderNumber: string
    purchaserName: string
    purchaserEmail: string
    orderStatus: string
    paidAt?: string
  }
  createdAt: string
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface ParticipantsResponse {
  participants: Participant[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

interface StrapiDataResponse<T> {
  data: T
}

/**
 * Fetch participants (tickets) for an event
 */
export async function getEventParticipants(
  eventDocumentId: string,
  page = 1,
  pageSize = 50
): Promise<ActionResult<ParticipantsResponse>> {
  const result = await strapiFetchWithQuery<StrapiDataResponse<ParticipantsResponse>>(
    "/admin/events/:eventDocumentId/participants",
    { eventDocumentId },
    { page: String(page), pageSize: String(pageSize) },
    { cache: "no-store" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to fetch participants",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Check in a participant
 */
export async function checkInParticipant(
  eventDocumentId: string,
  ticketDocumentId: string
): Promise<ActionResult<Participant>> {
  const result = await strapiFetch<StrapiDataResponse<Participant>>(
    "/admin/events/:eventDocumentId/participants/:ticketDocumentId/check-in",
    { eventDocumentId, ticketDocumentId },
    { method: "PUT" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to check in participant",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Undo check-in for a participant
 */
export async function undoCheckIn(
  eventDocumentId: string,
  ticketDocumentId: string
): Promise<ActionResult<Participant>> {
  const result = await strapiFetch<StrapiDataResponse<Participant>>(
    "/admin/events/:eventDocumentId/participants/:ticketDocumentId/undo-check-in",
    { eventDocumentId, ticketDocumentId },
    { method: "PUT" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to undo check-in",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

/**
 * Get participant statistics for an event
 */
export async function getParticipantStats(
  eventDocumentId: string
): Promise<ActionResult<{ total: number; checkedIn: number; pending: number }>> {
  const result = await strapiFetch<
    StrapiDataResponse<{ total: number; checkedIn: number; pending: number }>
  >("/admin/events/:eventDocumentId/participants/stats", { eventDocumentId }, { cache: "no-store" })

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to fetch participant stats",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}

export interface AddParticipantPayload {
  /** Enroll an existing player by documentId */
  playerDocumentId?: string
  /** Or create a brand-new player profile from these fields */
  newPlayer?: {
    name: string
    email?: string
    company?: string
  }
}

/**
 * Add a participant to an event (organizer only).
 *
 * Enrolls an existing player or creates a new one, issues a free "external"
 * ticket (no purchase) and adds them to the event attendee list. No email is sent.
 */
export async function addParticipant(
  eventDocumentId: string,
  payload: AddParticipantPayload
): Promise<ActionResult<Participant>> {
  const result = await strapiFetch<StrapiDataResponse<{ participant: Participant }>>(
    "/admin/events/:eventDocumentId/participants",
    { eventDocumentId },
    { method: "POST", body: { data: payload } }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to add participant",
    }
  }

  return {
    success: true,
    data: result.data?.data?.participant,
  }
}

/**
 * Remove a manually-added participant (a comp ticket with no order) from an event.
 * The API rejects removal of purchased/self-registered tickets.
 */
export async function removeParticipant(
  eventDocumentId: string,
  ticketDocumentId: string
): Promise<ActionResult> {
  const result = await strapiFetch<StrapiDataResponse<{ documentId: string; removed: boolean }>>(
    "/admin/events/:eventDocumentId/participants/:ticketDocumentId",
    { eventDocumentId, ticketDocumentId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to remove participant",
    }
  }

  return { success: true }
}
