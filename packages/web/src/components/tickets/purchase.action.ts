"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

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
  ticketingMode?: "none" | "internal" | "external"
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
  const result = await strapiFetch<{ data: EventTicketsResponse }>(
    "/events/:eventId/tickets",
    { eventId },
    { cache: "no-store", noAuth: true }
  )

  if (!result.ok) {
    console.error("[Tickets] Failed to fetch tickets:", result.status)
    return null
  }

  return result.data?.data || null
}

export interface InitiateOrderError {
  message: string
  code?: string
}

/**
 * Initiate a ticket purchase order
 */
export async function initiateTicketPurchase(
  eventId: string,
  tickets: TicketSelection[],
  discountCode?: string
): Promise<{ success: boolean; data?: InitiateOrderResponse; error?: InitiateOrderError }> {
  const result = await strapiFetch<{ data: InitiateOrderResponse }>(
    "/ticket-orders",
    {},
    {
      method: "POST",
      body: {
        data: {
          eventId,
          tickets,
          ...(discountCode && { discountCode }),
        },
      },
      optionalAuth: true,
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: {
        message: result.error || "Failed to create order",
      },
    }
  }

  return { success: true, data: result.data?.data }
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<OrderStatusResponse | null> {
  const result = await strapiFetch<{ data: OrderStatusResponse }>(
    "/ticket-orders/:orderId",
    { orderId },
    { cache: "no-store", optionalAuth: true }
  )

  if (!result.ok) {
    console.error("[Tickets] Failed to fetch order:", result.status)
    return null
  }

  return result.data?.data || null
}

/**
 * Get current user's orders
 */
export async function getMyOrders(): Promise<MyOrderSummary[]> {
  const result = await strapiFetch<{ data: MyOrderSummary[] }>(
    "/ticket-orders/me",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[Tickets] Failed to fetch orders:", result.status)
    return []
  }

  return result.data?.data || []
}

/**
 * Request refund for an order
 */
export async function requestRefund(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/ticket-orders/:orderId/refund",
    { orderId },
    {
      method: "POST",
      body: { data: { reason } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to process refund",
    }
  }

  return { success: true }
}

// ============================================================================
// AUTH STATUS
// ============================================================================

export interface AuthStatus {
  isAuthenticated: boolean
  hasPlayer: boolean
  user?: {
    email: string
    username: string
  }
  player?: {
    documentId: string
    name: string
  }
}

/**
 * Check the current user's authentication status for ticket purchases
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  const result = await strapiFetchWithQuery<{
    email: string
    username: string
    player?: { documentId: string; name: string }
  }>(
    "/users/me",
    {},
    { populate: "player" },
    { cache: "no-store", optionalAuth: true }
  )

  if (!result.ok || !result.data) {
    return { isAuthenticated: false, hasPlayer: false }
  }

  const user = result.data
  return {
    isAuthenticated: true,
    hasPlayer: !!user.player,
    user: {
      email: user.email,
      username: user.username,
    },
    player: user.player
      ? {
          documentId: user.player.documentId,
          name: user.player.name,
        }
      : undefined,
  }
}

// ============================================================================
// DISCOUNT CODES
// ============================================================================

export interface DiscountValidationResult {
  valid: boolean
  code?: string
  discountType?: "percentage" | "fixed"
  discountValue?: number
  discountAmount?: number
  description?: string
  error?: string
}

/**
 * Validate a discount code for an event
 */
export async function validateDiscountCode(
  eventId: string,
  code: string,
  orderAmount: number
): Promise<DiscountValidationResult> {
  const result = await strapiFetch<{
    data: {
      code: string
      discountType: "percentage" | "fixed"
      discountValue: number
      discountAmount: number
      description?: string
    }
  }>(
    "/events/:eventId/discount-codes/validate",
    { eventId },
    {
      method: "POST",
      body: { data: { code, orderAmount } },
      noAuth: true,
    }
  )

  if (!result.ok) {
    return {
      valid: false,
      error: result.error || "Invalid discount code",
    }
  }

  return {
    valid: true,
    code: result.data?.data.code,
    discountType: result.data?.data.discountType,
    discountValue: result.data?.data.discountValue,
    discountAmount: result.data?.data.discountAmount,
    description: result.data?.data.description,
  }
}

/**
 * Mark an order as cancelled (when user abandons checkout)
 */
export async function cancelPendingOrder(orderId: string): Promise<{ success: boolean }> {
  const result = await strapiFetch(
    "/ticket-orders/:orderId/cancel",
    { orderId },
    { method: "POST", noAuth: true }
  )

  if (!result.ok) {
    console.error("[Tickets] Failed to cancel order:", result.status)
    return { success: false }
  }

  return { success: true }
}

// ============================================================================
// DRAFT ORDER FLOW (MULTI-STEP CHECKOUT WITH ATTENDEE INFO)
// ============================================================================

export interface AttendeeInfo {
  firstName: string
  lastName: string
  email: string
  tshirtSize: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL" | "none"
  foodPreferences: string
  photoConsent: boolean
}

export interface PlayerDefaults {
  email: string
  firstName: string
  lastName: string
  defaultTshirtSize?: string
  defaultFoodPreferences?: string
}

export interface DraftOrderResponse {
  orderId: string
  orderNumber: string
  ticketCount: number
  totalAmount: number
  discountAmount: number
  currency: string
  playerDefaults?: PlayerDefaults
  ticketDetails: Array<{
    ticketTypeId: string
    ticketTypeName: string
    quantity: number
    unitPrice: number
  }>
}

export interface DraftOrderError {
  message: string
  code?: string
}

/**
 * Create a draft order to collect attendee information
 */
export async function createDraftOrder(
  eventId: string,
  tickets: TicketSelection[],
  discountCode?: string
): Promise<{ success: boolean; data?: DraftOrderResponse; error?: DraftOrderError }> {
  const result = await strapiFetch<{ data: DraftOrderResponse }>(
    "/ticket-orders/draft",
    {},
    {
      method: "POST",
      body: {
        data: {
          eventId,
          tickets,
          ...(discountCode && { discountCode }),
        },
      },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: { message: result.error || "Failed to create draft order" },
    }
  }

  return { success: true, data: result.data?.data }
}

export interface UpdateAttendeeInfoResponse {
  success: boolean
  readyForCheckout: boolean
}

/**
 * Update attendee information for a draft order
 */
export async function updateAttendeeInfo(
  orderId: string,
  attendees: AttendeeInfo[],
  gdprConsent: boolean,
  termsAccepted: boolean
): Promise<{ success: boolean; data?: UpdateAttendeeInfoResponse; error?: string }> {
  const result = await strapiFetch<{ data: UpdateAttendeeInfoResponse }>(
    "/ticket-orders/:orderId/attendees",
    { orderId },
    {
      method: "PUT",
      body: {
        data: {
          attendees,
          gdprConsent,
          termsAccepted,
        },
      },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update attendee information",
    }
  }

  return { success: true, data: result.data?.data }
}

export interface FinalizeCheckoutResponse {
  checkoutUrl?: string
  status: string
  orderNumber: string
}

/**
 * Finalize a draft order and create payment session
 */
export async function finalizeCheckout(
  orderId: string
): Promise<{ success: boolean; data?: FinalizeCheckoutResponse; error?: string }> {
  const result = await strapiFetch<{ data: FinalizeCheckoutResponse }>(
    "/ticket-orders/:orderId/checkout",
    { orderId },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to finalize checkout",
    }
  }

  return { success: true, data: result.data?.data }
}
