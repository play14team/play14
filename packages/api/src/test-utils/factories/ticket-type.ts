/**
 * Ticket Type test data factory
 */

export interface TicketTypeFixture {
  documentId: string
  name: string
  description: string | null
  price: number
  currency: string
  capacity: number | null
  soldCount: number
  reservedCount: number
  isActive: boolean
  sortOrder: number
  salesStartDate: string | null
  salesEndDate: string | null
  createdAt: string
  updatedAt: string
}

let ticketTypeCounter = 0

/**
 * Create a ticket type fixture with sensible defaults
 */
export function createTicketType(
  overrides: Partial<TicketTypeFixture> = {}
): TicketTypeFixture {
  ticketTypeCounter++
  const now = new Date().toISOString()

  return {
    documentId: `tt-${ticketTypeCounter}`,
    name: `Ticket Type ${ticketTypeCounter}`,
    description: null,
    price: 50,
    currency: "EUR",
    capacity: 100,
    soldCount: 0,
    reservedCount: 0,
    isActive: true,
    sortOrder: ticketTypeCounter,
    salesStartDate: null,
    salesEndDate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create an unlimited capacity ticket type
 */
export function createUnlimitedTicketType(
  overrides: Partial<TicketTypeFixture> = {}
): TicketTypeFixture {
  return createTicketType({
    name: "Unlimited Ticket",
    capacity: null,
    ...overrides,
  })
}

/**
 * Create a sold out ticket type
 */
export function createSoldOutTicketType(
  overrides: Partial<TicketTypeFixture> = {}
): TicketTypeFixture {
  const capacity = overrides.capacity ?? 50
  return createTicketType({
    name: "Sold Out Ticket",
    capacity,
    soldCount: capacity ?? 0,
    reservedCount: 0,
    ...overrides,
  })
}

/**
 * Create an inactive ticket type
 */
export function createInactiveTicketType(
  overrides: Partial<TicketTypeFixture> = {}
): TicketTypeFixture {
  return createTicketType({
    name: "Inactive Ticket",
    isActive: false,
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetTicketTypeCounter(): void {
  ticketTypeCounter = 0
}
