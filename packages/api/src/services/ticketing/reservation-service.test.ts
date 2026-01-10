/**
 * Unit tests for the ticket reservation service
 *
 * Tests cover all reservation functions:
 * - createReservations: Reserve tickets when Stripe checkout starts
 * - confirmReservations: Convert reservations to sold on payment success
 * - releaseReservations: Release reservations on cancellation/expiry
 * - rollbackReservations: Handle partial failures during creation
 * - getReservationExpiry: Calculate expiry time
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"
import type { Core } from "@strapi/strapi"
import {
  createReservations,
  confirmReservations,
  releaseReservations,
  rollbackReservations,
  getReservationExpiry,
} from "./reservation-service"

// ============================================================================
// Test Fixtures
// ============================================================================

interface TicketTypeFixture {
  documentId: string
  name: string
  capacity: number | null
  soldCount: number
  reservedCount: number
  isActive: boolean
}

interface OrderFixture {
  documentId: string
  orderNumber: string
  hasReservation: boolean
  reservationCreatedAt: string | null
  reservationExpiresAt: string | null
  ticketDetails: Array<{ ticketTypeId: string; quantity: number }>
}

const createTicketType = (overrides: Partial<TicketTypeFixture> = {}): TicketTypeFixture => ({
  documentId: "tt-123",
  name: "Early Bird",
  capacity: 100,
  soldCount: 0,
  reservedCount: 0,
  isActive: true,
  ...overrides,
})

const createOrder = (overrides: Partial<OrderFixture> = {}): OrderFixture => ({
  documentId: "order-123",
  orderNumber: "ORD-001",
  hasReservation: false,
  reservationCreatedAt: null,
  reservationExpiresAt: null,
  ticketDetails: [{ ticketTypeId: "tt-123", quantity: 2 }],
  ...overrides,
})

// ============================================================================
// Mock Strapi Factory
// ============================================================================

interface MockDatabase {
  ticketTypes: Map<string, TicketTypeFixture>
  orders: Map<string, OrderFixture>
}

interface MockDocumentService {
  findOne: Mock
  update: Mock
}

interface MockStrapi {
  documents: Mock<[string], MockDocumentService>
  log: {
    debug: Mock
    info: Mock
    warn: Mock
    error: Mock
  }
  db: {
    connection: any
  }
}

/**
 * Creates a mock Knex connection that simulates atomic SQL operations.
 * This mock handles the raw SQL queries used by the reservation service.
 */
function createMockKnex(db: MockDatabase) {
  // Helper to simulate raw SQL queries
  const rawQuery = vi.fn(async (sql: string, params?: any[]) => {
    const sqlLower = sql.toLowerCase().replace(/\s+/g, " ").trim()

    // Handle UPDATE ticket_types with reservation (atomicReserveTickets)
    // SQL: UPDATE ticket_types SET reserved_count = COALESCE(reserved_count, 0) + ? WHERE document_id = ? AND ...
    if (
      sqlLower.includes("update ticket_types") &&
      sqlLower.includes("reserved_count = coalesce(reserved_count, 0) +") &&
      sqlLower.includes("returning")
    ) {
      const quantity = params?.[0] as number
      const documentId = params?.[1] as string

      const ticketType = db.ticketTypes.get(documentId)
      if (!ticketType) {
        return { rows: [] }
      }

      const available =
        ticketType.capacity !== null
          ? ticketType.capacity - (ticketType.soldCount || 0) - (ticketType.reservedCount || 0)
          : Infinity

      if (available < quantity) {
        return { rows: [] }
      }

      ticketType.reservedCount = (ticketType.reservedCount || 0) + quantity
      return {
        rows: [
          {
            id: 1,
            document_id: documentId,
            name: ticketType.name,
            capacity: ticketType.capacity,
            sold_count: ticketType.soldCount,
            reserved_count: ticketType.reservedCount,
          },
        ],
      }
    }

    // Handle UPDATE ticket_types for release (atomicReleaseTickets)
    // SQL: UPDATE ticket_types SET reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - ?) WHERE document_id = ?
    if (
      sqlLower.includes("update ticket_types") &&
      sqlLower.includes("reserved_count = greatest(0, coalesce(reserved_count, 0) -") &&
      !sqlLower.includes("sold_count")
    ) {
      const quantity = params?.[0] as number
      const documentId = params?.[1] as string

      const ticketType = db.ticketTypes.get(documentId)
      if (ticketType) {
        ticketType.reservedCount = Math.max(0, (ticketType.reservedCount || 0) - quantity)
      }
      return { rows: [] }
    }

    // Handle UPDATE ticket_types for confirm with reservation (atomicConfirmTickets)
    // SQL: UPDATE ticket_types SET sold_count = COALESCE(sold_count, 0) + ?, reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - ?) WHERE document_id = ?
    if (
      sqlLower.includes("update ticket_types") &&
      sqlLower.includes("sold_count = coalesce(sold_count, 0) +") &&
      sqlLower.includes("reserved_count = greatest(0, coalesce(reserved_count, 0) -")
    ) {
      const quantity = params?.[0] as number
      const documentId = params?.[2] as string

      const ticketType = db.ticketTypes.get(documentId)
      if (ticketType) {
        ticketType.soldCount = (ticketType.soldCount || 0) + quantity
        ticketType.reservedCount = Math.max(0, (ticketType.reservedCount || 0) - quantity)
      }
      return { rows: [] }
    }

    // Handle UPDATE ticket_types for confirm without reservation (atomicConfirmTickets)
    // SQL: UPDATE ticket_types SET sold_count = COALESCE(sold_count, 0) + ? WHERE document_id = ?
    if (
      sqlLower.includes("update ticket_types") &&
      sqlLower.includes("sold_count = coalesce(sold_count, 0) +") &&
      !sqlLower.includes("reserved_count")
    ) {
      const quantity = params?.[0] as number
      const documentId = params?.[1] as string

      const ticketType = db.ticketTypes.get(documentId)
      if (ticketType) {
        ticketType.soldCount = (ticketType.soldCount || 0) + quantity
      }
      return { rows: [] }
    }

    return { rows: [] }
  })

  // Query builder for table lookups (used in error path)
  const queryBuilder = (table: string) => ({
    where: (column: string, value: string) => ({
      first: async () => {
        if (table === "ticket_types") {
          const ticketType = db.ticketTypes.get(value)
          if (ticketType) {
            return {
              id: 1,
              document_id: ticketType.documentId,
              name: ticketType.name,
              capacity: ticketType.capacity,
              sold_count: ticketType.soldCount,
              reserved_count: ticketType.reservedCount,
            }
          }
        }
        return null
      },
    }),
  })

  // Create the mock knex function that also has .raw and .transaction methods
  const mockKnex: any = vi.fn((table: string) => queryBuilder(table))
  mockKnex.raw = rawQuery

  // Transaction mock - executes callback with a transaction context
  // The trx object has the same interface as knex
  mockKnex.transaction = vi.fn(async (callback: (trx: any) => Promise<void>) => {
    const trx: any = vi.fn((table: string) => queryBuilder(table))
    trx.raw = rawQuery
    await callback(trx)
  })

  return mockKnex
}

function createMockStrapi(db: MockDatabase): MockStrapi {
  const documentServices = new Map<string, MockDocumentService>()

  const getDocumentService = (collection: string): MockDocumentService => {
    if (!documentServices.has(collection)) {
      documentServices.set(collection, {
        findOne: vi.fn(({ documentId }) => {
          if (collection.includes("ticket-type")) {
            return Promise.resolve(db.ticketTypes.get(documentId) || null)
          }
          if (collection.includes("ticket-order")) {
            return Promise.resolve(db.orders.get(documentId) || null)
          }
          return Promise.resolve(null)
        }),
        update: vi.fn(({ documentId, data }) => {
          if (collection.includes("ticket-type")) {
            const ticketType = db.ticketTypes.get(documentId)
            if (ticketType) {
              Object.assign(ticketType, data)
              return Promise.resolve(ticketType)
            }
          }
          if (collection.includes("ticket-order")) {
            const order = db.orders.get(documentId)
            if (order) {
              Object.assign(order, data)
              return Promise.resolve(order)
            }
          }
          return Promise.resolve(null)
        }),
      })
    }
    return documentServices.get(collection)!
  }

  return {
    documents: vi.fn((collection: string) => getDocumentService(collection)),
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    db: {
      connection: createMockKnex(db),
    },
  }
}

// ============================================================================
// createReservations() Tests
// ============================================================================

describe("createReservations", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      ticketTypes: new Map(),
      orders: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("creates reservation for single ticket type", async () => {
    const ticketType = createTicketType({ documentId: "tt-1", reservedCount: 0 })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 2 }],
      expiresAt
    )

    expect(result.success).toBe(true)
    expect(ticketType.reservedCount).toBe(2)
    expect(order.hasReservation).toBe(true)
    expect(order.reservationExpiresAt).toBe(expiresAt.toISOString())
  })

  it("creates reservations for multiple ticket types", async () => {
    const ticketType1 = createTicketType({ documentId: "tt-1", name: "Early Bird" })
    const ticketType2 = createTicketType({ documentId: "tt-2", name: "Regular" })
    const order = createOrder({
      documentId: "order-1",
      ticketDetails: [
        { ticketTypeId: "tt-1", quantity: 2 },
        { ticketTypeId: "tt-2", quantity: 3 },
      ],
    })
    db.ticketTypes.set("tt-1", ticketType1)
    db.ticketTypes.set("tt-2", ticketType2)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [
        { ticketTypeId: "tt-1", quantity: 2 },
        { ticketTypeId: "tt-2", quantity: 3 },
      ],
      expiresAt
    )

    expect(result.success).toBe(true)
    expect(ticketType1.reservedCount).toBe(2)
    expect(ticketType2.reservedCount).toBe(3)
    expect(result.reservedQuantities?.get("tt-1")).toBe(2)
    expect(result.reservedQuantities?.get("tt-2")).toBe(3)
  })

  it("fails when ticket type not found in phase 1", async () => {
    const order = createOrder({ documentId: "order-1" })
    db.orders.set("order-1", order)
    // Note: No ticket type added to db

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-nonexistent", quantity: 2 }],
      expiresAt
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
    expect(order.hasReservation).toBe(false)
  })

  it("fails when insufficient availability", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 10,
      soldCount: 5,
      reservedCount: 3,
    })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 5 }], // Available is only 2
      expiresAt
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("Not enough tickets")
    expect(result.error).toContain("2 remaining")
    expect(ticketType.reservedCount).toBe(3) // Unchanged
  })

  it("handles unlimited capacity (no capacity set)", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: null, // Unlimited
      soldCount: 1000,
      reservedCount: 500,
    })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 10000 }],
      expiresAt
    )

    expect(result.success).toBe(true)
    expect(ticketType.reservedCount).toBe(10500)
  })

  it("updates order with reservation flags", async () => {
    const ticketType = createTicketType({ documentId: "tt-1" })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 2 }],
      expiresAt
    )

    expect(order.hasReservation).toBe(true)
    expect(order.reservationCreatedAt).not.toBeNull()
    expect(order.reservationExpiresAt).toBe(expiresAt.toISOString())
  })

  it("calculates availability correctly with existing sold and reserved", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 100,
      soldCount: 40,
      reservedCount: 30,
    })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    // Available = 100 - 40 - 30 = 30
    // Request 30 should succeed
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 30 }],
      expiresAt
    )

    expect(result.success).toBe(true)
    expect(ticketType.reservedCount).toBe(60) // 30 + 30
  })

  it("fails exact boundary - requesting one more than available", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 100,
      soldCount: 40,
      reservedCount: 30,
    })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    // Available = 30, requesting 31 should fail
    const result = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 31 }],
      expiresAt
    )

    expect(result.success).toBe(false)
    expect(ticketType.reservedCount).toBe(30) // Unchanged
  })
})

// ============================================================================
// confirmReservations() Tests
// ============================================================================

describe("confirmReservations", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      ticketTypes: new Map(),
      orders: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("moves count from reserved to sold", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      soldCount: 10,
      reservedCount: 5,
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const quantities = new Map([["tt-1", 3]])
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-1", quantities)

    expect(ticketType.soldCount).toBe(13) // 10 + 3
    expect(ticketType.reservedCount).toBe(2) // 5 - 3
  })

  it("handles order without reservation flag", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      soldCount: 10,
      reservedCount: 5,
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: false, // No reservation
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const quantities = new Map([["tt-1", 3]])
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-1", quantities)

    expect(ticketType.soldCount).toBe(13) // Still increments sold
    expect(ticketType.reservedCount).toBe(5) // But doesn't decrement reserved
  })

  it("handles order not found", async () => {
    // No order in database
    const quantities = new Map([["tt-1", 3]])
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-nonexistent", quantities)

    expect(mockStrapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not found for confirmation")
    )
  })

  it("allows confirmation even when soldCount exceeds capacity (overselling)", async () => {
    // Note: The confirmation service does not prevent overselling because the reservation
    // was already made and payment succeeded. The atomic SQL updates proceed regardless.
    // Overselling should be prevented at reservation time, not confirmation time.
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 10,
      soldCount: 8,
      reservedCount: 5,
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const quantities = new Map([["tt-1", 5]]) // Will make soldCount = 13, exceeds capacity 10
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-1", quantities)

    // Confirmation proceeds - overselling is allowed at this stage
    // (it should have been caught at reservation time)
    expect(ticketType.soldCount).toBe(13)
    expect(ticketType.reservedCount).toBe(0) // Reserved count decremented
  })

  it("clears reservation flags on order", async () => {
    const ticketType = createTicketType({ documentId: "tt-1" })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
      reservationCreatedAt: "2024-01-01T00:00:00Z",
      reservationExpiresAt: "2024-01-01T00:30:00Z",
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    const quantities = new Map([["tt-1", 2]])
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-1", quantities)

    expect(order.hasReservation).toBe(false)
    expect(order.reservationCreatedAt).toBeNull()
    expect(order.reservationExpiresAt).toBeNull()
  })

  it("processes multiple ticket types", async () => {
    const ticketType1 = createTicketType({
      documentId: "tt-1",
      soldCount: 5,
      reservedCount: 10,
    })
    const ticketType2 = createTicketType({
      documentId: "tt-2",
      soldCount: 3,
      reservedCount: 8,
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
    })
    db.ticketTypes.set("tt-1", ticketType1)
    db.ticketTypes.set("tt-2", ticketType2)
    db.orders.set("order-1", order)

    const quantities = new Map([
      ["tt-1", 2],
      ["tt-2", 4],
    ])
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-1", quantities)

    expect(ticketType1.soldCount).toBe(7)
    expect(ticketType1.reservedCount).toBe(8)
    expect(ticketType2.soldCount).toBe(7)
    expect(ticketType2.reservedCount).toBe(4)
  })
})

// ============================================================================
// releaseReservations() Tests
// ============================================================================

describe("releaseReservations", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      ticketTypes: new Map(),
      orders: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("decrements reservedCount correctly", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      reservedCount: 10,
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
      ticketDetails: [{ ticketTypeId: "tt-1", quantity: 3 }],
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-1")

    expect(ticketType.reservedCount).toBe(7) // 10 - 3
  })

  it("returns early if no reservation", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      reservedCount: 10,
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: false, // No reservation
      ticketDetails: [{ ticketTypeId: "tt-1", quantity: 3 }],
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-1")

    expect(ticketType.reservedCount).toBe(10) // Unchanged
    expect(mockStrapi.log.debug).toHaveBeenCalledWith(
      expect.stringContaining("no active reservation")
    )
  })

  it("returns early if order not found", async () => {
    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-nonexistent")

    expect(mockStrapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not found for release")
    )
  })

  it("prevents negative reservedCount", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      reservedCount: 1, // Less than what we're releasing
    })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
      ticketDetails: [{ ticketTypeId: "tt-1", quantity: 5 }], // Releasing more than reserved
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-1")

    expect(ticketType.reservedCount).toBe(0) // Math.max(0, ...) prevents negative
  })

  it("clears reservation flags on order", async () => {
    const ticketType = createTicketType({ documentId: "tt-1", reservedCount: 5 })
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
      reservationCreatedAt: "2024-01-01T00:00:00Z",
      reservationExpiresAt: "2024-01-01T00:30:00Z",
      ticketDetails: [{ ticketTypeId: "tt-1", quantity: 2 }],
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-1")

    expect(order.hasReservation).toBe(false)
    expect(order.reservationCreatedAt).toBeNull()
    expect(order.reservationExpiresAt).toBeNull()
  })

  it("handles missing ticket type gracefully", async () => {
    // Order references a ticket type that doesn't exist
    const order = createOrder({
      documentId: "order-1",
      hasReservation: true,
      ticketDetails: [{ ticketTypeId: "tt-nonexistent", quantity: 2 }],
    })
    db.orders.set("order-1", order)

    // Should not throw
    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-1")

    // Order should still be updated
    expect(order.hasReservation).toBe(false)
  })
})

// ============================================================================
// rollbackReservations() Tests
// ============================================================================

describe("rollbackReservations", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      ticketTypes: new Map(),
      orders: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("decrements reservedCount for all ticket types", async () => {
    const ticketType1 = createTicketType({ documentId: "tt-1", reservedCount: 10 })
    const ticketType2 = createTicketType({ documentId: "tt-2", reservedCount: 8 })
    db.ticketTypes.set("tt-1", ticketType1)
    db.ticketTypes.set("tt-2", ticketType2)

    const reservedQuantities = new Map([
      ["tt-1", 3],
      ["tt-2", 5],
    ])
    await rollbackReservations(mockStrapi as unknown as Core.Strapi, reservedQuantities)

    expect(ticketType1.reservedCount).toBe(7)
    expect(ticketType2.reservedCount).toBe(3)
  })

  it("handles empty map", async () => {
    const reservedQuantities = new Map<string, number>()
    await rollbackReservations(mockStrapi as unknown as Core.Strapi, reservedQuantities)

    // Should complete without error
    expect(mockStrapi.log.debug).not.toHaveBeenCalled()
  })

  it("handles rollback errors gracefully and continues", async () => {
    const ticketType1 = createTicketType({ documentId: "tt-1", reservedCount: 10 })
    // tt-2 doesn't exist - will cause "error" (null return)
    const ticketType3 = createTicketType({ documentId: "tt-3", reservedCount: 5 })
    db.ticketTypes.set("tt-1", ticketType1)
    db.ticketTypes.set("tt-3", ticketType3)

    const reservedQuantities = new Map([
      ["tt-1", 2],
      ["tt-2", 3], // This one doesn't exist
      ["tt-3", 1],
    ])
    await rollbackReservations(mockStrapi as unknown as Core.Strapi, reservedQuantities)

    // tt-1 and tt-3 should still be rolled back
    expect(ticketType1.reservedCount).toBe(8)
    expect(ticketType3.reservedCount).toBe(4)
  })

  it("prevents negative reservedCount", async () => {
    const ticketType = createTicketType({ documentId: "tt-1", reservedCount: 2 })
    db.ticketTypes.set("tt-1", ticketType)

    const reservedQuantities = new Map([["tt-1", 10]]) // More than reserved
    await rollbackReservations(mockStrapi as unknown as Core.Strapi, reservedQuantities)

    expect(ticketType.reservedCount).toBe(0) // Not negative
  })
})

// ============================================================================
// getReservationExpiry() Tests
// ============================================================================

describe("getReservationExpiry", () => {
  it("returns provided date when sessionExpiresAt given", () => {
    const providedDate = new Date("2024-06-15T12:00:00Z")
    const result = getReservationExpiry(providedDate)
    expect(result).toBe(providedDate)
  })

  it("returns 30 minutes from now when no argument", () => {
    const before = Date.now()
    const result = getReservationExpiry()
    const after = Date.now()

    // Should be approximately 30 minutes from now
    const thirtyMinutes = 30 * 60 * 1000
    expect(result.getTime()).toBeGreaterThanOrEqual(before + thirtyMinutes)
    expect(result.getTime()).toBeLessThanOrEqual(after + thirtyMinutes)
  })

  it("returns 30 minutes from now when undefined passed", () => {
    const before = Date.now()
    const result = getReservationExpiry(undefined)
    const after = Date.now()

    const thirtyMinutes = 30 * 60 * 1000
    expect(result.getTime()).toBeGreaterThanOrEqual(before + thirtyMinutes)
    expect(result.getTime()).toBeLessThanOrEqual(after + thirtyMinutes)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Reservation Lifecycle Integration", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      ticketTypes: new Map(),
      orders: new Map(),
    }
    mockStrapi = createMockStrapi(db)
  })

  it("completes full reservation lifecycle: create -> confirm", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 100,
      soldCount: 50,
      reservedCount: 0,
    })
    const order = createOrder({ documentId: "order-1" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    // Step 1: Create reservation
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    const createResult = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 5 }],
      expiresAt
    )

    expect(createResult.success).toBe(true)
    expect(ticketType.reservedCount).toBe(5)
    expect(ticketType.soldCount).toBe(50)
    expect(order.hasReservation).toBe(true)

    // Step 2: Confirm reservation (payment success)
    const quantities = new Map([["tt-1", 5]])
    await confirmReservations(mockStrapi as unknown as Core.Strapi, "order-1", quantities)

    expect(ticketType.reservedCount).toBe(0) // Reserved moved to sold
    expect(ticketType.soldCount).toBe(55) // Increased by 5
    expect(order.hasReservation).toBe(false)
  })

  it("completes full reservation lifecycle: create -> release (cancelled)", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 100,
      soldCount: 50,
      reservedCount: 0,
    })
    // Order must have ticketDetails that match what's being reserved
    // (releaseReservations reads ticketDetails from the order)
    const order = createOrder({
      documentId: "order-1",
      ticketDetails: [{ ticketTypeId: "tt-1", quantity: 5 }],
    })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order)

    // Step 1: Create reservation
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 5 }],
      expiresAt
    )

    expect(ticketType.reservedCount).toBe(5)

    // Step 2: Release reservation (user cancelled or session expired)
    await releaseReservations(mockStrapi as unknown as Core.Strapi, "order-1")

    expect(ticketType.reservedCount).toBe(0) // Released
    expect(ticketType.soldCount).toBe(50) // Unchanged
    expect(order.hasReservation).toBe(false)
  })

  it("prevents overbooking in concurrent scenario", async () => {
    const ticketType = createTicketType({
      documentId: "tt-1",
      capacity: 10,
      soldCount: 5,
      reservedCount: 0,
    })
    const order1 = createOrder({ documentId: "order-1" })
    const order2 = createOrder({ documentId: "order-2" })
    db.ticketTypes.set("tt-1", ticketType)
    db.orders.set("order-1", order1)
    db.orders.set("order-2", order2)

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    // User 1: Reserve 3 tickets (5 available, 5 sold)
    const result1 = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-1",
      [{ ticketTypeId: "tt-1", quantity: 3 }],
      expiresAt
    )

    expect(result1.success).toBe(true)
    expect(ticketType.reservedCount).toBe(3)
    // Available now: 10 - 5 - 3 = 2

    // User 2: Try to reserve 3 tickets (only 2 available)
    const result2 = await createReservations(
      mockStrapi as unknown as Core.Strapi,
      "order-2",
      [{ ticketTypeId: "tt-1", quantity: 3 }],
      expiresAt
    )

    expect(result2.success).toBe(false)
    expect(result2.error).toContain("2 remaining")
    expect(ticketType.reservedCount).toBe(3) // Unchanged
  })
})
