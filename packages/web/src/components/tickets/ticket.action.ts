"use server"

import { strapiFetch } from "@/libs/strapi-client"

export interface TicketDetails {
  documentId: string
  ticketCode: string
  ticketStatus: string
  attendeeName: string
  attendeeEmail: string
  attendeeDetails?: {
    firstName: string
    lastName: string
    email: string
    tshirtSize?: string
    foodPreferences?: string
  }
  checkedInAt?: string
  ticketType?: {
    name: string
    price: number
    currency: string
    description?: string
  }
  event?: {
    documentId: string
    name: string
    slug: string
    start: string
    end: string
    eventStatus: string
    defaultImage?: {
      url: string
      width: number
      height: number
    }
    location?: {
      name: string
      country: string
    }
    venue?: {
      name: string
      website?: string
    }
  }
  order?: {
    orderNumber: string
    purchaserEmail: string
    purchaserName: string
  }
  player?: {
    documentId: string
    name: string
    slug: string
  }
}

export interface MyTicket {
  documentId: string
  ticketCode: string
  ticketStatus: string
  attendeeName: string
  attendeeEmail: string
  checkedInAt?: string
  ticketType?: {
    name: string
    price: number
    currency: string
  }
  event: {
    documentId: string
    name: string
    slug: string
    start: string
    end: string
    eventStatus: string
    defaultImage?: {
      url: string
      width: number
      height: number
    }
    location?: {
      name: string
    }
  }
  order?: {
    orderNumber: string
    status: string
  }
}

/**
 * Get ticket details by ID or code
 */
export async function getTicketDetails(ticketId: string): Promise<TicketDetails | null> {
  const result = await strapiFetch<{ data: TicketDetails }>(
    "/tickets/:ticketId",
    { ticketId },
    { cache: "no-store", noAuth: true }
  )

  if (!result.ok) {
    console.error("[Tickets] Failed to fetch ticket:", result.status)
    return null
  }

  return result.data?.data || null
}

/**
 * Get current user's tickets
 */
export async function getMyTickets(): Promise<MyTicket[]> {
  const result = await strapiFetch<{ data: MyTicket[] }>("/tickets/me", {}, { cache: "no-store" })

  if (!result.ok) {
    console.error("[Tickets] Failed to fetch tickets:", result.status)
    return []
  }

  return result.data?.data || []
}
