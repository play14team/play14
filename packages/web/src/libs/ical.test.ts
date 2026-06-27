/**
 * Unit tests for ICS timezone helpers.
 */

import { describe, expect, it } from "vitest"
import { anchorIcsToTimezone, zonedDateParts } from "./ical"

describe("zonedDateParts", () => {
  it("expresses a UTC instant as the venue's local wall-clock", () => {
    // 14:00Z is 16:00 in Paris during summer (UTC+2).
    const parts = zonedDateParts(new Date("2026-06-27T14:00:00.000Z"), "Europe/Paris")
    expect(parts).toEqual([2026, 6, 27, 16, 0])
  })

  it("handles zones behind UTC", () => {
    // 14:00Z is 10:00 in New York during summer (UTC-4).
    const parts = zonedDateParts(new Date("2026-06-27T14:00:00.000Z"), "America/New_York")
    expect(parts).toEqual([2026, 6, 27, 10, 0])
  })

  it("handles half-hour offsets", () => {
    const parts = zonedDateParts(new Date("2026-06-27T14:00:00.000Z"), "Asia/Kolkata")
    expect(parts).toEqual([2026, 6, 27, 19, 30])
  })

  it("is identical to the input for UTC", () => {
    const parts = zonedDateParts(new Date("2026-06-27T14:00:00.000Z"), "UTC")
    expect(parts).toEqual([2026, 6, 27, 14, 0])
  })
})

describe("anchorIcsToTimezone", () => {
  const floatingIcs = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "DTSTAMP:20260627T111108Z",
    "DTSTART:20260627T160000",
    "DTEND:20260627T200000",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n")

  it("tags DTSTART/DTEND with the TZID", () => {
    const result = anchorIcsToTimezone(
      floatingIcs,
      "Europe/Paris",
      new Date("2026-06-27T14:00:00.000Z")
    )
    expect(result).toContain("DTSTART;TZID=Europe/Paris:20260627T160000")
    expect(result).toContain("DTEND;TZID=Europe/Paris:20260627T200000")
  })

  it("leaves DTSTAMP (UTC) untouched", () => {
    const result = anchorIcsToTimezone(
      floatingIcs,
      "Europe/Paris",
      new Date("2026-06-27T14:00:00.000Z")
    )
    expect(result).toContain("DTSTAMP:20260627T111108Z")
  })

  it("prepends a VTIMEZONE block with the correct offset before the event", () => {
    const result = anchorIcsToTimezone(
      floatingIcs,
      "Europe/Paris",
      new Date("2026-06-27T14:00:00.000Z")
    )
    expect(result).toContain("BEGIN:VTIMEZONE")
    expect(result).toContain("TZID:Europe/Paris")
    expect(result).toContain("TZOFFSETTO:+0200")
    expect(result.indexOf("BEGIN:VTIMEZONE")).toBeLessThan(result.indexOf("BEGIN:VEVENT"))
  })

  it("uses the winter offset when the event start is in standard time", () => {
    const result = anchorIcsToTimezone(
      floatingIcs,
      "Europe/Paris",
      new Date("2026-01-15T14:00:00.000Z")
    )
    expect(result).toContain("TZOFFSETTO:+0100")
  })

  it("formats negative offsets", () => {
    const result = anchorIcsToTimezone(
      floatingIcs,
      "America/New_York",
      new Date("2026-06-27T14:00:00.000Z")
    )
    expect(result).toContain("TZOFFSETTO:-0400")
  })
})
