/**
 * Unit tests for payment provider factory
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the StripeProvider
vi.mock("./providers/stripe", () => ({
  StripeProvider: vi.fn().mockImplementation(() => ({
    createCheckoutSession: vi.fn(),
    processRefund: vi.fn(),
  })),
}))

// Set environment variable before importing
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key"

describe("getPaymentProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module cache to ensure fresh singleton
    vi.resetModules()
  })

  describe("stripe provider", () => {
    it("returns a StripeProvider instance for stripe type", async () => {
      // Re-import after mock
      const { getPaymentProvider } = await import("./factory")
      const provider = getPaymentProvider("stripe")

      expect(provider).toBeDefined()
    })

    it("returns the same instance on subsequent calls (singleton)", async () => {
      const { getPaymentProvider } = await import("./factory")
      const provider1 = getPaymentProvider("stripe")
      const provider2 = getPaymentProvider("stripe")

      expect(provider1).toBe(provider2)
    })
  })

  describe("manual provider", () => {
    it("throws error for manual payment type", async () => {
      const { getPaymentProvider } = await import("./factory")

      expect(() => getPaymentProvider("manual")).toThrow(
        "Manual payment does not support programmatic processing"
      )
    })
  })

  describe("unknown provider", () => {
    it("throws error for unknown payment type", async () => {
      const { getPaymentProvider } = await import("./factory")

      // @ts-expect-error - Testing invalid input
      expect(() => getPaymentProvider("unknown")).toThrow("Unknown payment provider type: unknown")
    })
  })
})
