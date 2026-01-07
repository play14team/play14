"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface TicketTypeInfo {
  documentId: string
  name: string
  description?: string
  price: number
  currency: string
  available: number | null
  soldOut: boolean
  // Date availability info
  validFrom?: string
  validUntil?: string
  notYetAvailable: boolean
  expired: boolean
  withinDateRange: boolean
}

export interface EventTicketsResponse {
  eventId: string
  eventName: string
  ticketingEnabled: boolean
  paymentProvider?: string
  globalCapacity?: number
  ticketTypes: TicketTypeInfo[]
  hasPaymentProvider: boolean
}

export interface TicketSelection {
  ticketTypeId: string
  quantity: number
}

export interface InitiateOrderResponse {
  orderId: string
  orderNumber: string
  checkoutUrl: string
  expiresAt?: string
}

export interface OrderTicket {
  documentId: string
  ticketCode: string
  status: string
  attendeeName: string
  attendeeEmail: string
  ticketType?: string
  checkedInAt?: string
}

export interface OrderStatusResponse {
  documentId: string
  orderNumber: string
  status: string
  totalAmount: number
  currency: string
  purchaserName: string
  purchaserEmail: string
  paidAt?: string
  refundedAt?: string
  refundAmount?: number
  event: {
    name: string
    slug: string
    start: string
    end: string
  }
  tickets?: OrderTicket[]
}

export interface MyOrderSummary {
  documentId: string
  orderNumber: string
  status: string
  totalAmount: number
  currency: string
  paidAt?: string
  event: {
    documentId: string
    name: string
    slug: string
    start: string
    end: string
  }
  ticketCount: number
}

/**
 * Get available ticket types for an event
 * @param eventId - The event document ID
 */
export async function getAvailableTickets(
  eventId: string
): Promise<EventTicketsResponse | null> {
  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${eventId}/tickets`, {
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[Tickets] Failed to fetch tickets:", response.status)
      return null
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error("[Tickets] Error fetching tickets:", error)
    return null
  }
}

/**
 * Initiate a ticket purchase order
 */
export async function initiateTicketPurchase(
  eventId: string,
  tickets: TicketSelection[],
  purchaserInfo?: { name: string; email: string }
): Promise<{ success: boolean; data?: InitiateOrderResponse; error?: string }> {
  const jwt = await getAuthCookie()

  try {
    const response = await fetch(`${STRAPI_URL}/api/ticket-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(jwt && { Authorization: `Bearer ${jwt}` }),
      },
      body: JSON.stringify({
        data: {
          eventId,
          tickets,
          ...purchaserInfo,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || "Failed to create order",
      }
    }

    const result = await response.json()
    return { success: true, data: result.data }
  } catch (error) {
    console.error("[Tickets] Error initiating purchase:", error)
    return { success: false, error: "An error occurred. Please try again." }
  }
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse | null> {
  const jwt = await getAuthCookie()

  try {
    const response = await fetch(`${STRAPI_URL}/api/ticket-orders/${orderId}`, {
      headers: {
        ...(jwt && { Authorization: `Bearer ${jwt}` }),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[Tickets] Failed to fetch order:", response.status)
      return null
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error("[Tickets] Error fetching order:", error)
    return null
  }
}

/**
 * Get current user's orders
 */
export async function getMyOrders(): Promise<MyOrderSummary[]> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return []
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/ticket-orders/me`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[Tickets] Failed to fetch orders:", response.status)
      return []
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error("[Tickets] Error fetching orders:", error)
    return []
  }
}

/**
 * Request refund for an order
 */
export async function requestRefund(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/ticket-orders/${orderId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: { reason },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.error?.message || "Failed to process refund",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[Tickets] Error requesting refund:", error)
    return { success: false, error: "An error occurred. Please try again." }
  }
}
