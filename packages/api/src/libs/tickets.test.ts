/**
 * Unit tests for ticket utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { generateOrderNumber, generateTicketCode } from "./tickets"

describe("generateOrderNumber", () => {
  beforeEach(() => {
    // Mock Date to have consistent test results
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-03-14T10:30:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts with P14 prefix", () => {
    const orderNumber = generateOrderNumber()
    expect(orderNumber).toMatch(/^P14-/)
  })

  it("includes date in YYYYMMDD format", () => {
    const orderNumber = generateOrderNumber()
    expect(orderNumber).toContain("20250314")
  })

  it("has format P14-YYYYMMDD-XXXXXX", () => {
    const orderNumber = generateOrderNumber()
    expect(orderNumber).toMatch(/^P14-\d{8}-[A-F0-9]{6}$/)
  })

  it("generates unique order numbers", () => {
    const orders = new Set<string>()
    for (let i = 0; i < 100; i++) {
      orders.add(generateOrderNumber())
    }
    expect(orders.size).toBe(100)
  })

  it("has uppercase hex characters in random part", () => {
    const orderNumber = generateOrderNumber()
    const randomPart = orderNumber.split("-")[2]
    expect(randomPart).toMatch(/^[A-F0-9]+$/)
  })

  it("random part is exactly 6 characters", () => {
    const orderNumber = generateOrderNumber()
    const randomPart = orderNumber.split("-")[2]
    expect(randomPart.length).toBe(6)
  })

  describe("date handling across months", () => {
    it("handles January correctly", () => {
      vi.setSystemTime(new Date("2025-01-05T10:00:00Z"))
      const orderNumber = generateOrderNumber()
      expect(orderNumber).toContain("20250105")
    })

    it("handles December correctly", () => {
      vi.setSystemTime(new Date("2025-12-31T23:59:59Z"))
      const orderNumber = generateOrderNumber()
      expect(orderNumber).toContain("20251231")
    })

    it("handles single-digit days", () => {
      vi.setSystemTime(new Date("2025-03-01T10:00:00Z"))
      const orderNumber = generateOrderNumber()
      expect(orderNumber).toContain("20250301")
    })
  })
})

describe("generateTicketCode", () => {
  it("starts with TKT prefix", () => {
    const ticketCode = generateTicketCode()
    expect(ticketCode).toMatch(/^TKT-/)
  })

  it("has format TKT-XXXXXXXXXXXX (12 hex chars)", () => {
    const ticketCode = generateTicketCode()
    expect(ticketCode).toMatch(/^TKT-[A-F0-9]{12}$/)
  })

  it("generates unique ticket codes", () => {
    const tickets = new Set<string>()
    for (let i = 0; i < 100; i++) {
      tickets.add(generateTicketCode())
    }
    expect(tickets.size).toBe(100)
  })

  it("has uppercase hex characters", () => {
    const ticketCode = generateTicketCode()
    const randomPart = ticketCode.split("-")[1]
    expect(randomPart).toMatch(/^[A-F0-9]+$/)
  })

  it("random part is exactly 12 characters", () => {
    const ticketCode = generateTicketCode()
    const randomPart = ticketCode.split("-")[1]
    expect(randomPart.length).toBe(12)
  })

  it("total length is 16 characters (TKT- + 12)", () => {
    const ticketCode = generateTicketCode()
    expect(ticketCode.length).toBe(16)
  })
})

describe("uniqueness guarantees", () => {
  it("generates highly unique order numbers (allows statistical variance)", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-03-14T10:30:00Z"))

    const orders = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      orders.add(generateOrderNumber())
    }
    // With 6 hex chars (16^6 = 16.7M possibilities), birthday paradox means
    // ~3% chance of collision in 1000 samples. Allow up to 5 collisions.
    expect(orders.size).toBeGreaterThanOrEqual(995)

    vi.useRealTimers()
  })

  it("generates highly unique ticket codes (allows statistical variance)", () => {
    const tickets = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      tickets.add(generateTicketCode())
    }
    // With 12 hex chars (16^12 = 281 trillion possibilities), collisions
    // are extremely unlikely but not impossible. Allow up to 2 collisions.
    expect(tickets.size).toBeGreaterThanOrEqual(998)
  })
})
