/**
 * Unit tests for date formatting utilities
 */

import { describe, expect, it } from "vitest"
import { formatDate } from "./dates"

describe("formatDate", () => {
  describe("same month events", () => {
    it("formats dates within the same month", () => {
      const result = formatDate("2025-03-14T09:00:00Z", "2025-03-16T17:00:00Z", "UTC")

      expect(result).toBe("March 14-16 ")
    })

    it("formats single day event", () => {
      const result = formatDate("2025-03-14T09:00:00Z", "2025-03-14T17:00:00Z", "UTC")

      expect(result).toBe("March 14-14 ")
    })
  })

  describe("cross-month events", () => {
    it("formats dates spanning two months", () => {
      const result = formatDate("2025-03-30T09:00:00Z", "2025-04-01T17:00:00Z", "UTC")

      expect(result).toBe("March 30-April 01 ")
    })

    it("formats year-end to year-start event", () => {
      const result = formatDate("2025-12-30T09:00:00Z", "2026-01-02T17:00:00Z", "UTC")

      expect(result).toBe("December 30-January 02 ")
    })
  })

  describe("with displayYear option", () => {
    it("includes year when displayYear is true", () => {
      const result = formatDate("2025-03-14T09:00:00Z", "2025-03-16T17:00:00Z", "UTC", true)

      expect(result).toBe("March 14-16 2025")
    })

    it("includes year for cross-month events", () => {
      const result = formatDate("2025-03-30T09:00:00Z", "2025-04-01T17:00:00Z", "UTC", true)

      expect(result).toBe("March 30-April 01 2025")
    })
  })

  describe("timezone handling", () => {
    it("uses provided timezone", () => {
      // Event that starts on 14th in Paris but 13th in UTC due to time
      const result = formatDate(
        "2025-03-14T01:00:00Z", // 1am UTC = 2am Paris
        "2025-03-16T17:00:00Z",
        "Europe/Paris"
      )

      expect(result).toContain("March")
      expect(result).toContain("14")
    })

    it("defaults to UTC when timezone is null", () => {
      const result = formatDate("2025-03-14T09:00:00Z", "2025-03-16T17:00:00Z", null)

      expect(result).toBe("March 14-16 ")
    })

    it("defaults to UTC when timezone is undefined", () => {
      const result = formatDate("2025-03-14T09:00:00Z", "2025-03-16T17:00:00Z", undefined)

      expect(result).toBe("March 14-16 ")
    })
  })

  describe("input formats", () => {
    it("accepts Date objects", () => {
      const start = new Date("2025-03-14T09:00:00Z")
      const end = new Date("2025-03-16T17:00:00Z")

      const result = formatDate(start, end, "UTC")

      expect(result).toBe("March 14-16 ")
    })

    it("accepts ISO date strings", () => {
      const result = formatDate("2025-03-14T09:00:00.000Z", "2025-03-16T17:00:00.000Z", "UTC")

      expect(result).toBe("March 14-16 ")
    })
  })

  describe("edge cases", () => {
    it("handles different timezones correctly", () => {
      // Same event in different timezones
      const resultUTC = formatDate("2025-03-14T09:00:00Z", "2025-03-16T17:00:00Z", "UTC")

      const resultTokyo = formatDate("2025-03-14T09:00:00Z", "2025-03-16T17:00:00Z", "Asia/Tokyo")

      // Tokyo is UTC+9, so dates should be different
      expect(resultUTC).not.toBe(resultTokyo)
    })

    it("handles February correctly", () => {
      const result = formatDate("2025-02-14T09:00:00Z", "2025-02-16T17:00:00Z", "UTC")

      expect(result).toBe("February 14-16 ")
    })

    it("handles leap year February", () => {
      const result = formatDate("2024-02-28T09:00:00Z", "2024-03-01T17:00:00Z", "UTC")

      expect(result).toBe("February 28-March 01 ")
    })
  })
})
