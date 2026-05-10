/**
 * Tests for the email-log retention cron.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanOldEmailLogs } from "./email-logs"

function createMockKnexBuilder() {
  return {
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockResolvedValue(0),
  }
}

function createMockStrapi() {
  const builder = createMockKnexBuilder()
  return {
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: { connection: vi.fn().mockReturnValue(builder) },
    _builder: builder,
  } as any
}

describe("cleanOldEmailLogs", () => {
  let mockStrapi: ReturnType<typeof createMockStrapi>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStrapi = createMockStrapi()
  })

  it("deletes rows older than the retention cutoff and returns the count", async () => {
    mockStrapi._builder.delete.mockResolvedValue(42)

    const deletedCount = await cleanOldEmailLogs(mockStrapi, 90)

    expect(deletedCount).toBe(42)
    expect(mockStrapi.db.connection).toHaveBeenCalledWith("email_logs")
    expect(mockStrapi._builder.where).toHaveBeenCalledWith("sent_at", "<", expect.any(Date))
    expect(mockStrapi._builder.delete).toHaveBeenCalledOnce()
    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      "[EmailLogs] Purged 42 email-log rows older than 90 days"
    )
  })

  it("defaults to a 90-day retention window", async () => {
    await cleanOldEmailLogs(mockStrapi)

    const cutoff = mockStrapi._builder.where.mock.calls[0][2] as Date
    const ageInDays = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000)
    // setDate() is local-time, so DST transitions can shift this by ~1h
    // (~0.042d). Bounds are loose enough to absorb that without missing a
    // true off-by-one in retention days.
    expect(ageInDays).toBeGreaterThanOrEqual(89.9)
    expect(ageInDays).toBeLessThanOrEqual(90.1)
  })

  it("stays quiet when there is nothing to delete", async () => {
    mockStrapi._builder.delete.mockResolvedValue(0)

    const deletedCount = await cleanOldEmailLogs(mockStrapi, 90)

    expect(deletedCount).toBe(0)
    expect(mockStrapi.log.info).not.toHaveBeenCalled()
  })

  it("respects a custom retention window", async () => {
    mockStrapi._builder.delete.mockResolvedValue(3)

    await cleanOldEmailLogs(mockStrapi, 7)

    const cutoff = mockStrapi._builder.where.mock.calls[0][2] as Date
    const ageInDays = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000)
    expect(ageInDays).toBeGreaterThanOrEqual(6.9)
    expect(ageInDays).toBeLessThanOrEqual(7.1)
    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      "[EmailLogs] Purged 3 email-log rows older than 7 days"
    )
  })
})
