/**
 * Unit tests for webhook idempotency service
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  claimWebhookEvent,
  cleanupOldWebhookRecords,
  markWebhookCompleted,
  markWebhookFailed,
  releaseWebhookClaim,
} from "./idempotency-service"

// Helper to create mock Knex query builder
function createMockKnexBuilder() {
  const builder: any = {
    insert: vi.fn().mockResolvedValue([1]),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(1),
    first: vi.fn().mockResolvedValue(null),
  }
  return builder
}

// Helper to create mock strapi instance
function createMockStrapi() {
  const mockKnexBuilder = createMockKnexBuilder()

  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    db: {
      connection: vi.fn().mockReturnValue(mockKnexBuilder),
    },
    _mockKnexBuilder: mockKnexBuilder,
  } as any
}

describe("idempotency-service", () => {
  let mockStrapi: ReturnType<typeof createMockStrapi>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStrapi = createMockStrapi()
  })

  describe("claimWebhookEvent", () => {
    it("claims event successfully when not already processed", async () => {
      const result = await claimWebhookEvent(
        mockStrapi,
        "evt_test_123",
        "checkout.session.completed"
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.alreadyProcessed).toBe(false)
      expect(mockStrapi._mockKnexBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: "evt_test_123",
          event_type: "checkout.session.completed",
          provider: "stripe",
          webhook_status: "processing",
        })
      )
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Idempotency] Claimed event evt_test_123 for processing"
      )
    })

    it("returns shouldProcess false when event already exists", async () => {
      // Mock unique constraint violation (PostgreSQL)
      const uniqueError = new Error("duplicate key value violates unique constraint")
      ;(uniqueError as any).code = "23505"

      mockStrapi._mockKnexBuilder.insert.mockRejectedValue(uniqueError)
      mockStrapi._mockKnexBuilder.first.mockResolvedValue({
        event_id: "evt_test_123",
        webhook_status: "completed",
      })

      const result = await claimWebhookEvent(
        mockStrapi,
        "evt_test_123",
        "checkout.session.completed"
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.alreadyProcessed).toBe(true)
      expect(result.webhookStatus).toBe("completed")
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Idempotency] Event evt_test_123 already completed - skipping"
      )
    })

    it("returns shouldProcess false when event is currently processing", async () => {
      const uniqueError = new Error("UNIQUE constraint failed")

      mockStrapi._mockKnexBuilder.insert.mockRejectedValue(uniqueError)
      mockStrapi._mockKnexBuilder.first.mockResolvedValue({
        event_id: "evt_test_123",
        webhook_status: "processing",
      })

      const result = await claimWebhookEvent(
        mockStrapi,
        "evt_test_123",
        "checkout.session.completed"
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.alreadyProcessed).toBe(true)
      expect(result.webhookStatus).toBe("processing")
    })

    it("throws non-unique-constraint errors", async () => {
      const otherError = new Error("Database connection failed")
      ;(otherError as any).code = "ECONNREFUSED"

      mockStrapi._mockKnexBuilder.insert.mockRejectedValue(otherError)

      await expect(
        claimWebhookEvent(mockStrapi, "evt_test_123", "checkout.session.completed")
      ).rejects.toThrow("Database connection failed")
    })
  })

  describe("markWebhookCompleted", () => {
    it("updates event status to completed", async () => {
      await markWebhookCompleted(mockStrapi, "evt_test_123", { orderId: "123" })

      expect(mockStrapi._mockKnexBuilder.where).toHaveBeenCalledWith("event_id", "evt_test_123")
      expect(mockStrapi._mockKnexBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_status: "completed",
          metadata: JSON.stringify({ orderId: "123" }),
        })
      )
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Idempotency] Event evt_test_123 marked as completed"
      )
    })

    it("marks completed without metadata", async () => {
      await markWebhookCompleted(mockStrapi, "evt_test_456")

      expect(mockStrapi._mockKnexBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_status: "completed",
          metadata: null,
        })
      )
    })
  })

  describe("markWebhookFailed", () => {
    it("updates event status to failed with error message", async () => {
      await markWebhookFailed(mockStrapi, "evt_test_123", "Processing timeout")

      expect(mockStrapi._mockKnexBuilder.where).toHaveBeenCalledWith("event_id", "evt_test_123")
      expect(mockStrapi._mockKnexBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_status: "failed",
          metadata: JSON.stringify({ error: "Processing timeout" }),
        })
      )
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Idempotency] Event evt_test_123 marked as failed"
      )
    })
  })

  describe("releaseWebhookClaim", () => {
    it("deletes the event record to allow retry", async () => {
      await releaseWebhookClaim(mockStrapi, "evt_test_123")

      expect(mockStrapi._mockKnexBuilder.where).toHaveBeenCalledWith("event_id", "evt_test_123")
      expect(mockStrapi._mockKnexBuilder.delete).toHaveBeenCalled()
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Idempotency] Event evt_test_123 claim released for retry"
      )
    })
  })

  describe("cleanupOldWebhookRecords", () => {
    it("deletes old completed records", async () => {
      mockStrapi._mockKnexBuilder.delete.mockResolvedValue(5)

      const deletedCount = await cleanupOldWebhookRecords(mockStrapi, 7)

      expect(deletedCount).toBe(5)
      expect(mockStrapi._mockKnexBuilder.where).toHaveBeenCalledWith("webhook_status", "completed")
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Idempotency] Cleaned up 5 old webhook records"
      )
    })

    it("uses default 7 days when not specified", async () => {
      mockStrapi._mockKnexBuilder.delete.mockResolvedValue(0)

      await cleanupOldWebhookRecords(mockStrapi)

      // Verify cleanup was called (we can't easily verify the exact date)
      expect(mockStrapi._mockKnexBuilder.delete).toHaveBeenCalled()
    })
  })
})
