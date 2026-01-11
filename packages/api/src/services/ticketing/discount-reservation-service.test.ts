/**
 * Unit tests for the discount code reservation service
 *
 * Tests cover all discount code reservation functions:
 * - reserveDiscountCode: Reserve discount code usage when checkout starts
 * - confirmDiscountCode: Confirm usage on payment success
 * - releaseDiscountCode: Release reservation on cancellation/expiry
 * - useDiscountCodeAtomic: Atomic use for free orders
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"
import type { Core } from "@strapi/strapi"
import {
  reserveDiscountCode,
  confirmDiscountCode,
  releaseDiscountCode,
  useDiscountCodeAtomic,
} from "./discount-reservation-service"

// ============================================================================
// Test Fixtures
// ============================================================================

interface DiscountCodeFixture {
  id: number
  document_id: string
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  max_uses: number | null
  used_count: number
  reserved_count: number
  max_discount_amount: number | null
  min_order_amount: number | null
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
}

interface EventFixture {
  id: number
  document_id: string
  name: string
}

const createDiscountCode = (overrides: Partial<DiscountCodeFixture> = {}): DiscountCodeFixture => ({
  id: 1,
  document_id: "dc-123",
  code: "SAVE10",
  discount_type: "percentage",
  discount_value: 10,
  max_uses: 100,
  used_count: 0,
  reserved_count: 0,
  max_discount_amount: null,
  min_order_amount: null,
  is_active: true,
  valid_from: null,
  valid_until: null,
  ...overrides,
})

const createEvent = (overrides: Partial<EventFixture> = {}): EventFixture => ({
  id: 1,
  document_id: "event-123",
  name: "Test Event",
  ...overrides,
})

// ============================================================================
// Mock Database Factory
// ============================================================================

interface MockDatabase {
  discountCodes: Map<string, DiscountCodeFixture>
  events: Map<string, EventFixture>
  discountCodeEventLinks: Array<{ discount_code_id: number; event_id: number }>
}

function createMockKnex(db: MockDatabase) {
  // Track the code parameter from the raw query for use in the WHERE clause
  let lastRawCodeParam: string | null = null

  const rawQuery = vi.fn((sql: string, params?: any[]) => {
    const sqlLower = sql.toLowerCase().replace(/\s+/g, " ").trim()

    // Handle LOWER(discount_codes.code) = LOWER(?) - this is used as a where condition
    // knex.raw() returns an object that represents the raw SQL, we need to capture the params
    if (sqlLower.includes("lower(discount_codes.code)")) {
      lastRawCodeParam = params?.[0] as string
      // Return a marker object that the where handler can recognize
      return { __isRawCondition: true, codeParam: params?.[0] }
    }

    // Handle atomic reserve: UPDATE discount_codes SET reserved_count = ... RETURNING
    if (
      sqlLower.includes("update discount_codes") &&
      sqlLower.includes("reserved_count = coalesce(reserved_count, 0) + 1") &&
      sqlLower.includes("returning")
    ) {
      const documentId = params?.[0] as string
      const now = params?.[1] as string

      const discountCode = db.discountCodes.get(documentId)
      if (!discountCode) {
        return Promise.resolve({ rows: [] })
      }

      // Check conditions
      if (!discountCode.is_active) {
        return Promise.resolve({ rows: [] })
      }

      const currentTime = new Date(now)
      if (discountCode.valid_from && new Date(discountCode.valid_from) > currentTime) {
        return Promise.resolve({ rows: [] })
      }
      if (discountCode.valid_until && new Date(discountCode.valid_until) < currentTime) {
        return Promise.resolve({ rows: [] })
      }

      if (
        discountCode.max_uses !== null &&
        discountCode.used_count + discountCode.reserved_count >= discountCode.max_uses
      ) {
        return Promise.resolve({ rows: [] })
      }

      // Success - update reserved count
      discountCode.reserved_count += 1
      return Promise.resolve({
        rows: [
          {
            id: discountCode.id,
            document_id: discountCode.document_id,
            code: discountCode.code,
            discount_type: discountCode.discount_type,
            discount_value: discountCode.discount_value,
            max_uses: discountCode.max_uses,
            used_count: discountCode.used_count,
            reserved_count: discountCode.reserved_count,
            max_discount_amount: discountCode.max_discount_amount,
            min_order_amount: discountCode.min_order_amount,
          },
        ],
      })
    }

    // Handle atomic release: UPDATE discount_codes SET reserved_count = GREATEST(0, ...) ONLY
    // This should NOT have used_count in it - that's the confirm query
    if (
      sqlLower.includes("update discount_codes") &&
      sqlLower.includes("reserved_count = greatest(0, coalesce(reserved_count, 0) - 1)") &&
      !sqlLower.includes("used_count")
    ) {
      const documentId = params?.[0] as string
      const discountCode = db.discountCodes.get(documentId)
      if (discountCode) {
        discountCode.reserved_count = Math.max(0, discountCode.reserved_count - 1)
      }
      return Promise.resolve({ rows: [] })
    }

    // Handle atomic confirm with reservation: UPDATE SET used_count + 1, reserved_count - 1
    // SQL: UPDATE discount_codes SET used_count = COALESCE(used_count, 0) + 1, reserved_count = GREATEST(0, COALESCE(reserved_count, 0) - 1) WHERE document_id = ?
    if (
      sqlLower.includes("update discount_codes") &&
      sqlLower.includes("used_count = coalesce(used_count, 0) + 1") &&
      sqlLower.includes("reserved_count = greatest") &&
      !sqlLower.includes("returning")
    ) {
      const documentId = params?.[0] as string
      const discountCode = db.discountCodes.get(documentId)
      if (discountCode) {
        discountCode.used_count += 1
        discountCode.reserved_count = Math.max(0, discountCode.reserved_count - 1)
      }
      return Promise.resolve({ rows: [] })
    }

    // Handle atomic confirm without reservation: UPDATE SET used_count + 1 only
    // SQL: UPDATE discount_codes SET used_count = COALESCE(used_count, 0) + 1 WHERE document_id = ?
    if (
      sqlLower.includes("update discount_codes") &&
      sqlLower.includes("used_count = coalesce(used_count, 0) + 1") &&
      !sqlLower.includes("reserved_count") &&
      !sqlLower.includes("returning")
    ) {
      const documentId = params?.[0] as string
      const discountCode = db.discountCodes.get(documentId)
      if (discountCode) {
        discountCode.used_count += 1
      }
      return Promise.resolve({ rows: [] })
    }

    // Handle atomic use (for free orders): UPDATE with validation and RETURNING
    if (
      sqlLower.includes("update discount_codes") &&
      sqlLower.includes("used_count = coalesce(used_count, 0) + 1") &&
      sqlLower.includes("returning") &&
      !sqlLower.includes("reserved_count = coalesce(reserved_count, 0) + 1")
    ) {
      const documentId = params?.[0] as string
      const now = params?.[1] as string

      const discountCode = db.discountCodes.get(documentId)
      if (!discountCode) {
        return Promise.resolve({ rows: [] })
      }

      // Check conditions
      if (!discountCode.is_active) {
        return Promise.resolve({ rows: [] })
      }

      const currentTime = new Date(now)
      if (discountCode.valid_from && new Date(discountCode.valid_from) > currentTime) {
        return Promise.resolve({ rows: [] })
      }
      if (discountCode.valid_until && new Date(discountCode.valid_until) < currentTime) {
        return Promise.resolve({ rows: [] })
      }

      if (
        discountCode.max_uses !== null &&
        discountCode.used_count + discountCode.reserved_count >= discountCode.max_uses
      ) {
        return Promise.resolve({ rows: [] })
      }

      // Success - update used count
      discountCode.used_count += 1
      return Promise.resolve({
        rows: [
          {
            id: discountCode.id,
            document_id: discountCode.document_id,
            code: discountCode.code,
            discount_type: discountCode.discount_type,
            discount_value: discountCode.discount_value,
            max_uses: discountCode.max_uses,
            used_count: discountCode.used_count,
            reserved_count: discountCode.reserved_count,
            max_discount_amount: discountCode.max_discount_amount,
            min_order_amount: discountCode.min_order_amount,
          },
        ],
      })
    }

    return Promise.resolve({ rows: [] })
  })

  // Query builder for joins
  const queryBuilder = (table: string) => {
    let joinedTables: string[] = []
    let whereConditions: Array<{ column: string; value: any; codeParam?: string }> = []
    let selectedColumns: string[] = []

    const builder: any = {
      join: (joinTable: string, col1: string, col2: string) => {
        joinedTables.push(joinTable)
        return builder
      },
      where: (columnOrRaw: any, value?: any) => {
        if (typeof columnOrRaw === "string") {
          whereConditions.push({ column: columnOrRaw, value })
        } else if (columnOrRaw && columnOrRaw.__isRawCondition) {
          // This is a raw condition from knex.raw()
          whereConditions.push({ column: "raw", value: null, codeParam: columnOrRaw.codeParam })
        }
        return builder
      },
      select: (...columns: string[]) => {
        selectedColumns = columns.flat()
        return builder
      },
      first: async () => {
        // Find discount code by code (case-insensitive) linked to event
        if (table === "discount_codes" && joinedTables.includes("events")) {
          const codeCondition = whereConditions.find((c) => c.codeParam !== undefined)
          const eventCondition = whereConditions.find((c) => c.column === "events.document_id")

          if (codeCondition && eventCondition) {
            const searchCode = (codeCondition.codeParam as string).trim().toLowerCase()
            const eventDocId = eventCondition.value as string

            // Find event
            const event = db.events.get(eventDocId)
            if (!event) return null

            // Find discount code linked to this event
            for (const [docId, discountCode] of db.discountCodes) {
              if (discountCode.code.toLowerCase() === searchCode) {
                const link = db.discountCodeEventLinks.find(
                  (l) => l.discount_code_id === discountCode.id && l.event_id === event.id
                )
                if (link) {
                  if (selectedColumns.includes("discount_codes.document_id")) {
                    return { document_id: discountCode.document_id }
                  }
                  return discountCode
                }
              }
            }
          }
        }
        return null
      },
    }

    return builder
  }

  // Direct table query builder
  const tableQueryBuilder = (table: string) => {
    let whereConditions: Array<{ column: string; value: any }> = []

    const builder: any = {
      where: (column: string, value: any) => {
        whereConditions.push({ column, value })
        return builder
      },
      first: async () => {
        if (table === "discount_codes") {
          const docIdCondition = whereConditions.find((c) => c.column === "document_id")
          if (docIdCondition) {
            return db.discountCodes.get(docIdCondition.value) || null
          }
        }
        return null
      },
    }

    return builder
  }

  const mockKnex: any = vi.fn((table: string) => {
    if (table === "discount_codes") {
      // Check if it's being used for a join or direct query
      return {
        join: (joinTable: string, col1: string, col2: string) =>
          queryBuilder(table).join(joinTable, col1, col2),
        where: (column: string, value: any) => tableQueryBuilder(table).where(column, value),
      }
    }
    return queryBuilder(table)
  })
  mockKnex.raw = rawQuery

  return mockKnex
}

interface MockStrapi {
  documents: Mock
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

function createMockStrapi(db: MockDatabase): MockStrapi {
  return {
    documents: vi.fn(),
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
// reserveDiscountCode() Tests
// ============================================================================

describe("reserveDiscountCode", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      discountCodes: new Map(),
      events: new Map(),
      discountCodeEventLinks: [],
    }
    mockStrapi = createMockStrapi(db)
  })

  it("reserves a valid percentage discount code", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "SAVE10",
      discount_type: "percentage",
      discount_value: 10,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "SAVE10",
      100
    )

    expect(result.success).toBe(true)
    expect(result.discountCode?.code).toBe("SAVE10")
    expect(result.discountAmount).toBe(10) // 10% of 100
    expect(discountCode.reserved_count).toBe(1)
  })

  it("reserves a valid fixed discount code", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "FLAT20",
      discount_type: "fixed",
      discount_value: 20,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "FLAT20",
      100
    )

    expect(result.success).toBe(true)
    expect(result.discountAmount).toBe(20)
  })

  it("caps fixed discount at order amount", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "FLAT50",
      discount_type: "fixed",
      discount_value: 50,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "FLAT50",
      30 // Order is less than discount
    )

    expect(result.success).toBe(true)
    expect(result.discountAmount).toBe(30) // Capped at order amount
  })

  it("applies max discount amount cap to percentage discounts", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "SAVE50",
      discount_type: "percentage",
      discount_value: 50,
      max_discount_amount: 25,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "SAVE50",
      100 // 50% would be 50, but capped at 25
    )

    expect(result.success).toBe(true)
    expect(result.discountAmount).toBe(25)
  })

  it("fails for invalid discount code", async () => {
    const event = createEvent({ document_id: "event-1" })
    db.events.set("event-1", event)
    // No discount code in database

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "INVALID",
      100
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("Invalid discount code")
  })

  it("fails for inactive discount code", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "INACTIVE",
      is_active: false,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "INACTIVE",
      100
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("no longer active")
  })

  it("fails for expired discount code", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "EXPIRED",
      valid_until: "2020-01-01T00:00:00Z",
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "EXPIRED",
      100
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("expired")
  })

  it("fails for not yet active discount code", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "FUTURE",
      valid_from: "2099-01-01T00:00:00Z",
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "FUTURE",
      100
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("not yet active")
  })

  it("fails when usage limit reached", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "LIMITED",
      max_uses: 10,
      used_count: 8,
      reserved_count: 2,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "LIMITED",
      100
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("usage limit")
  })

  it("fails and releases reservation when order below minimum", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "MINORDER",
      min_order_amount: 50,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "MINORDER",
      30 // Below minimum
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("Minimum order amount")
    // Reservation should have been released
    expect(discountCode.reserved_count).toBe(0)
  })

  it("handles case-insensitive code matching", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "SAVE10",
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "save10", // lowercase
      100
    )

    expect(result.success).toBe(true)
  })

  it("handles unlimited usage discount codes", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "UNLIMITED",
      max_uses: null,
      used_count: 1000,
      reserved_count: 500,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "UNLIMITED",
      100
    )

    expect(result.success).toBe(true)
    expect(discountCode.reserved_count).toBe(501)
  })
})

// ============================================================================
// confirmDiscountCode() Tests
// ============================================================================

describe("confirmDiscountCode", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      discountCodes: new Map(),
      events: new Map(),
      discountCodeEventLinks: [],
    }
    mockStrapi = createMockStrapi(db)
  })

  it("moves count from reserved to used when had reservation", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      used_count: 5,
      reserved_count: 3,
    })
    db.discountCodes.set("dc-1", discountCode)

    await confirmDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1", true)

    expect(discountCode.used_count).toBe(6)
    expect(discountCode.reserved_count).toBe(2)
  })

  it("only increments used count when no reservation", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      used_count: 5,
      reserved_count: 3,
    })
    db.discountCodes.set("dc-1", discountCode)

    await confirmDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1", false)

    expect(discountCode.used_count).toBe(6)
    expect(discountCode.reserved_count).toBe(3) // Unchanged
  })

  it("logs confirmation", async () => {
    const discountCode = createDiscountCode({ document_id: "dc-1" })
    db.discountCodes.set("dc-1", discountCode)

    await confirmDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1", true)

    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining("Confirmed discount code usage")
    )
  })
})

// ============================================================================
// releaseDiscountCode() Tests
// ============================================================================

describe("releaseDiscountCode", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      discountCodes: new Map(),
      events: new Map(),
      discountCodeEventLinks: [],
    }
    mockStrapi = createMockStrapi(db)
  })

  it("decrements reserved count", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      reserved_count: 5,
    })
    db.discountCodes.set("dc-1", discountCode)

    await releaseDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1")

    expect(discountCode.reserved_count).toBe(4)
  })

  it("prevents negative reserved count", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      reserved_count: 0,
    })
    db.discountCodes.set("dc-1", discountCode)

    await releaseDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1")

    expect(discountCode.reserved_count).toBe(0)
  })

  it("logs release", async () => {
    const discountCode = createDiscountCode({ document_id: "dc-1" })
    db.discountCodes.set("dc-1", discountCode)

    await releaseDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1")

    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining("Released discount code reservation")
    )
  })
})

// ============================================================================
// useDiscountCodeAtomic() Tests
// ============================================================================

describe("useDiscountCodeAtomic", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      discountCodes: new Map(),
      events: new Map(),
      discountCodeEventLinks: [],
    }
    mockStrapi = createMockStrapi(db)
  })

  it("atomically uses a valid discount code", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "FREEUSE",
      discount_type: "percentage",
      discount_value: 100,
      used_count: 0,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await useDiscountCodeAtomic(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "FREEUSE",
      50
    )

    expect(result.success).toBe(true)
    expect(result.discountAmount).toBe(50) // 100% = full order
    expect(discountCode.used_count).toBe(1)
    expect(discountCode.reserved_count).toBe(0) // Not affected
  })

  it("fails for invalid code", async () => {
    const event = createEvent({ document_id: "event-1" })
    db.events.set("event-1", event)

    const result = await useDiscountCodeAtomic(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "INVALID",
      50
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("Invalid discount code")
  })

  it("fails when below minimum order amount", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "MINORDER",
      min_order_amount: 100,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await useDiscountCodeAtomic(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "MINORDER",
      50
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("Minimum order amount")
  })

  it("calculates fixed discount correctly", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "FLAT30",
      discount_type: "fixed",
      discount_value: 30,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    const result = await useDiscountCodeAtomic(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "FLAT30",
      100
    )

    expect(result.success).toBe(true)
    expect(result.discountAmount).toBe(30)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Discount Code Reservation Lifecycle", () => {
  let db: MockDatabase
  let mockStrapi: MockStrapi

  beforeEach(() => {
    db = {
      discountCodes: new Map(),
      events: new Map(),
      discountCodeEventLinks: [],
    }
    mockStrapi = createMockStrapi(db)
  })

  it("completes reserve -> confirm lifecycle", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "LIFECYCLE",
      max_uses: 10,
      used_count: 5,
      reserved_count: 0,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    // Step 1: Reserve
    const reserveResult = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "LIFECYCLE",
      100
    )

    expect(reserveResult.success).toBe(true)
    expect(discountCode.reserved_count).toBe(1)
    expect(discountCode.used_count).toBe(5)

    // Step 2: Confirm
    await confirmDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1", true)

    expect(discountCode.reserved_count).toBe(0)
    expect(discountCode.used_count).toBe(6)
  })

  it("completes reserve -> release lifecycle (cancellation)", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "CANCEL",
      max_uses: 10,
      used_count: 5,
      reserved_count: 0,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    // Step 1: Reserve
    await reserveDiscountCode(mockStrapi as unknown as Core.Strapi, "event-1", "CANCEL", 100)

    expect(discountCode.reserved_count).toBe(1)

    // Step 2: Release (user cancelled)
    await releaseDiscountCode(mockStrapi as unknown as Core.Strapi, "dc-1")

    expect(discountCode.reserved_count).toBe(0)
    expect(discountCode.used_count).toBe(5) // Unchanged
  })

  it("prevents concurrent overuse", async () => {
    const discountCode = createDiscountCode({
      document_id: "dc-1",
      code: "LIMITED",
      max_uses: 2,
      used_count: 0,
      reserved_count: 0,
    })
    const event = createEvent({ document_id: "event-1" })
    db.discountCodes.set("dc-1", discountCode)
    db.events.set("event-1", event)
    db.discountCodeEventLinks.push({ discount_code_id: 1, event_id: 1 })

    // User 1: Reserve
    const result1 = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "LIMITED",
      100
    )
    expect(result1.success).toBe(true)
    expect(discountCode.reserved_count).toBe(1)

    // User 2: Reserve
    const result2 = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "LIMITED",
      100
    )
    expect(result2.success).toBe(true)
    expect(discountCode.reserved_count).toBe(2)

    // User 3: Should fail (max_uses = 2)
    const result3 = await reserveDiscountCode(
      mockStrapi as unknown as Core.Strapi,
      "event-1",
      "LIMITED",
      100
    )
    expect(result3.success).toBe(false)
    expect(result3.error).toContain("usage limit")
  })
})
