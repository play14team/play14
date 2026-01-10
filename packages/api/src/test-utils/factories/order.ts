/**
 * Ticket Order test data factory
 */

import crypto from "crypto"

export interface TicketDetail {
  ticketTypeId: string
  quantity: number
  unitPrice: number
}

export interface OrderFixture {
  documentId: string
  orderNumber: string
  status: "pending" | "paid" | "cancelled" | "refunded"
  customerEmail: string
  customerName: string
  totalAmount: number
  currency: string
  ticketDetails: TicketDetail[]
  hasReservation: boolean
  reservationCreatedAt: string | null
  reservationExpiresAt: string | null
  paymentIntentId: string | null
  checkoutSessionId: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

let orderCounter = 0

/**
 * Generate a cryptographically secure random ID with a prefix
 */
function generateRandomId(prefix: string): string {
  return `${prefix}${crypto.randomBytes(16).toString("hex")}`
}

/**
 * Create an order fixture with sensible defaults
 */
export function createOrder(overrides: Partial<OrderFixture> = {}): OrderFixture {
  orderCounter++
  const now = new Date().toISOString()

  return {
    documentId: `order-${orderCounter}`,
    orderNumber: `P14-20250101-${String(orderCounter).padStart(6, "0")}`,
    status: "pending",
    customerEmail: `customer${orderCounter}@example.com`,
    customerName: `Customer ${orderCounter}`,
    totalAmount: 100,
    currency: "EUR",
    ticketDetails: [{ ticketTypeId: "tt-1", quantity: 2, unitPrice: 50 }],
    hasReservation: false,
    reservationCreatedAt: null,
    reservationExpiresAt: null,
    paymentIntentId: null,
    checkoutSessionId: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create an order with active reservation
 */
export function createOrderWithReservation(
  overrides: Partial<OrderFixture> = {}
): OrderFixture {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now

  return createOrder({
    hasReservation: true,
    reservationCreatedAt: now.toISOString(),
    reservationExpiresAt: expiresAt.toISOString(),
    ...overrides,
  })
}

/**
 * Create a paid order
 */
export function createPaidOrder(overrides: Partial<OrderFixture> = {}): OrderFixture {
  const now = new Date().toISOString()

  return createOrder({
    status: "paid",
    paymentIntentId: generateRandomId("pi_"),
    checkoutSessionId: generateRandomId("cs_"),
    paidAt: now,
    hasReservation: false,
    reservationCreatedAt: null,
    reservationExpiresAt: null,
    ...overrides,
  })
}

/**
 * Create a cancelled order
 */
export function createCancelledOrder(
  overrides: Partial<OrderFixture> = {}
): OrderFixture {
  return createOrder({
    status: "cancelled",
    hasReservation: false,
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetOrderCounter(): void {
  orderCounter = 0
}
