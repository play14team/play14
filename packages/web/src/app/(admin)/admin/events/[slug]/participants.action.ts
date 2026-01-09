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
    status: string // order status
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
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResult<ParticipantsResponse>> {
  const result = await strapiFetchWithQuery<StrapiDataResponse<ParticipantsResponse>>(
    "/events/:eventDocumentId/participants",
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
    "/events/:eventDocumentId/participants/:ticketDocumentId/check-in",
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
    "/events/:eventDocumentId/participants/:ticketDocumentId/undo-check-in",
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
  const result = await strapiFetch<StrapiDataResponse<{ total: number; checkedIn: number; pending: number }>>(
    "/events/:eventDocumentId/participants/stats",
    { eventDocumentId },
    { cache: "no-store" }
  )

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
