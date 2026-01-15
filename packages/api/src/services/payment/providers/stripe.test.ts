/**
 * Unit tests for Stripe payment provider
 *
 * Tests cover:
 * - Currency validation
 * - Checkout session creation (with and without Connect)
 * - Refund processing
 * - Webhook signature verification
 * - Order status retrieval
 * - Connect account management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  createMockCheckoutSession,
  createMockPaymentIntent,
  createMockAccount,
  createMockAccountLink,
  createMockRefund,
} from "../../../test-utils/factories"

// Mock Stripe SDK
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  paymentIntents: {
    retrieve: vi.fn(),
  },
  refunds: {
    create: vi.fn(),
  },
  accounts: {
    create: vi.fn(),
    retrieve: vi.fn(),
    createLoginLink: vi.fn(),
  },
  accountLinks: {
    create: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}

vi.mock("stripe", () => ({
  default: class StripeMock {
    constructor() {
      return mockStripeInstance
    }
  },
}))

// Set environment variables before importing the provider
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key"
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret"

// Import after mocking
import { StripeProvider } from "./stripe"

describe("StripeProvider", () => {
  let provider: StripeProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StripeProvider()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe("constructor", () => {
    it("throws error when STRIPE_SECRET_KEY is not set", () => {
      const originalKey = process.env.STRIPE_SECRET_KEY
      delete process.env.STRIPE_SECRET_KEY

      expect(() => new StripeProvider()).toThrow(
        "STRIPE_SECRET_KEY environment variable is not set"
      )

      process.env.STRIPE_SECRET_KEY = originalKey
    })
  })

  // ============================================================================
  // createCheckoutSession Tests
  // ============================================================================

  describe("createCheckoutSession", () => {
    it("creates a checkout session with valid params", async () => {
      const mockSession = createMockCheckoutSession({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/pay/cs_test_123",
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      })

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

      const result = await provider.createCheckoutSession({
        orderId: "order-123",
        currency: "EUR",
        customerEmail: "test@example.com",
        lineItems: [
          {
            name: "Early Bird Ticket",
            description: "Access to play14 event",
            quantity: 2,
            unitPrice: 50,
          },
        ],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })

      expect(result.sessionId).toBe("cs_test_123")
      expect(result.sessionUrl).toBe("https://checkout.stripe.com/pay/cs_test_123")
      expect(result.expiresAt).toBeInstanceOf(Date)

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ["card"],
          mode: "payment",
          customer_email: "test@example.com",
          success_url: "https://play14.org/success",
          cancel_url: "https://play14.org/cancel",
          metadata: expect.objectContaining({
            orderId: "order-123",
          }),
        })
      )
    })

    it("converts unit price to cents correctly", async () => {
      const mockSession = createMockCheckoutSession()
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

      await provider.createCheckoutSession({
        orderId: "order-123",
        currency: "EUR",
        customerEmail: "test@example.com",
        lineItems: [
          {
            name: "Ticket",
            quantity: 1,
            unitPrice: 99.99,
          },
        ],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 9999, // 99.99 * 100
              }),
            }),
          ],
        })
      )
    })

    it("throws error for invalid currency", async () => {
      await expect(
        provider.createCheckoutSession({
          orderId: "order-123",
          currency: "XYZ", // Valid 3-letter code but not supported
          customerEmail: "test@example.com",
          lineItems: [{ name: "Ticket", quantity: 1, unitPrice: 50 }],
          successUrl: "https://play14.org/success",
          cancelUrl: "https://play14.org/cancel",
        })
      ).rejects.toThrow("Unsupported currency: XYZ")
    })

    it("throws error for empty currency", async () => {
      await expect(
        provider.createCheckoutSession({
          orderId: "order-123",
          currency: "",
          customerEmail: "test@example.com",
          lineItems: [{ name: "Ticket", quantity: 1, unitPrice: 50 }],
          successUrl: "https://play14.org/success",
          cancelUrl: "https://play14.org/cancel",
        })
      ).rejects.toThrow("Currency is required")
    })

    it("normalizes currency to lowercase", async () => {
      const mockSession = createMockCheckoutSession()
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

      await provider.createCheckoutSession({
        orderId: "order-123",
        currency: "EUR", // uppercase
        customerEmail: "test@example.com",
        lineItems: [{ name: "Ticket", quantity: 1, unitPrice: 50 }],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "eur", // lowercase
              }),
            }),
          ],
        })
      )
    })
  })

  // ============================================================================
  // createCheckoutSessionWithConnect Tests
  // ============================================================================

  describe("createCheckoutSessionWithConnect", () => {
    it("creates a checkout session with Connect destination", async () => {
      const mockSession = createMockCheckoutSession()
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

      await provider.createCheckoutSessionWithConnect({
        orderId: "order-123",
        currency: "EUR",
        customerEmail: "test@example.com",
        connectedAccountId: "acct_test_connected",
        applicationFeeAmount: 500, // $5 platform fee
        lineItems: [
          {
            name: "VIP Ticket",
            quantity: 1,
            unitPrice: 100,
          },
        ],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 500,
            transfer_data: {
              destination: "acct_test_connected",
            },
          }),
        })
      )
    })

    it("uses 0 application fee when not provided", async () => {
      const mockSession = createMockCheckoutSession()
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

      await provider.createCheckoutSessionWithConnect({
        orderId: "order-123",
        currency: "EUR",
        customerEmail: "test@example.com",
        connectedAccountId: "acct_test_connected",
        lineItems: [{ name: "Ticket", quantity: 1, unitPrice: 50 }],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 0,
          }),
        })
      )
    })
  })

  // ============================================================================
  // processRefund Tests
  // ============================================================================

  describe("processRefund", () => {
    it("processes full refund successfully", async () => {
      const mockRefund = createMockRefund({
        id: "re_test_123",
        amount: 10000,
        status: "succeeded",
      })
      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund)

      const result = await provider.processRefund({
        providerOrderId: "pi_test_123",
      })

      expect(result.refundId).toBe("re_test_123")
      expect(result.amount).toBe(100) // Converted from cents
      expect(result.status).toBe("succeeded")
    })

    it("processes partial refund", async () => {
      const mockRefund = createMockRefund({
        amount: 2500,
        status: "succeeded",
      })
      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund)

      const result = await provider.processRefund({
        providerOrderId: "pi_test_123",
        amount: 25, // $25 partial refund
      })

      expect(result.amount).toBe(25)
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2500, // 25 * 100
        })
      )
    })

    it("returns pending status for non-succeeded refunds", async () => {
      const mockRefund = createMockRefund({
        status: "pending",
      })
      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund)

      const result = await provider.processRefund({
        providerOrderId: "pi_test_123",
      })

      expect(result.status).toBe("pending")
    })
  })

  // ============================================================================
  // verifyWebhookSignature Tests
  // ============================================================================

  describe("verifyWebhookSignature", () => {
    it("verifies valid webhook signature", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: { id: "cs_test_123", metadata: { orderId: "order-123" } },
        },
      }
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent)

      const result = await provider.verifyWebhookSignature(
        '{"type": "checkout.session.completed"}',
        "sig_test_123"
      )

      expect(result.type).toBe("checkout.session.completed")
      expect(result.data).toEqual(mockEvent.data.object)
    })

    it("throws error when webhook secret is not set", async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET
      const originalConnectSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT
      delete process.env.STRIPE_WEBHOOK_SECRET
      delete process.env.STRIPE_WEBHOOK_SECRET_CONNECT

      // Create new provider without webhook secrets
      const providerWithoutSecret = new StripeProvider()

      await expect(
        providerWithoutSecret.verifyWebhookSignature("payload", "sig")
      ).rejects.toThrow("At least one of STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_CONNECT must be set")

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret
      process.env.STRIPE_WEBHOOK_SECRET_CONNECT = originalConnectSecret
    })
  })

  // ============================================================================
  // getOrderStatus Tests
  // ============================================================================

  describe("getOrderStatus", () => {
    it("returns paid for succeeded payment intent", async () => {
      const mockPI = createMockPaymentIntent({ status: "succeeded" })
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPI)

      const status = await provider.getOrderStatus("pi_test_123")

      expect(status).toBe("paid")
    })

    it("returns pending for processing payment intent", async () => {
      const mockPI = createMockPaymentIntent({ status: "processing" })
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPI)

      const status = await provider.getOrderStatus("pi_test_123")

      expect(status).toBe("pending")
    })

    it("returns pending for requires_payment_method", async () => {
      const mockPI = createMockPaymentIntent({ status: "requires_payment_method" })
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPI)

      const status = await provider.getOrderStatus("pi_test_123")

      expect(status).toBe("pending")
    })

    it("returns failed for canceled payment intent", async () => {
      const mockPI = createMockPaymentIntent({ status: "canceled" })
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPI)

      const status = await provider.getOrderStatus("pi_test_123")

      expect(status).toBe("failed")
    })
  })

  // ============================================================================
  // Connect Account Tests
  // ============================================================================

  describe("createExpressAccount", () => {
    it("creates an Express account with default settings", async () => {
      const mockAccount = createMockAccount({
        id: "acct_test_123",
        country: "FR",
      })
      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount)

      const result = await provider.createExpressAccount({
        email: "host@play14.org",
      })

      expect(result.accountId).toBe("acct_test_123")
      expect(result.chargesEnabled).toBe(true)
      expect(result.payoutsEnabled).toBe(true)
      expect(result.detailsSubmitted).toBe(true)
      expect(result.country).toBe("FR")

      expect(mockStripeInstance.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "express",
          email: "host@play14.org",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        })
      )
    })

    it("creates account with custom country and business type", async () => {
      const mockAccount = createMockAccount({
        country: "DE",
      })
      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount)

      await provider.createExpressAccount({
        email: "host@play14.org",
        country: "DE",
        businessType: "company",
      })

      expect(mockStripeInstance.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "DE",
          business_type: "company",
        })
      )
    })
  })

  describe("createAccountLink", () => {
    it("creates an onboarding link", async () => {
      const mockLink = createMockAccountLink({
        url: "https://connect.stripe.com/setup/e/acct_test/abc",
        expires_at: Math.floor(Date.now() / 1000) + 300,
      })
      mockStripeInstance.accountLinks.create.mockResolvedValue(mockLink)

      const result = await provider.createAccountLink(
        "acct_test_123",
        "https://play14.org/onboarding/return",
        "https://play14.org/onboarding/refresh"
      )

      expect(result.url).toBe("https://connect.stripe.com/setup/e/acct_test/abc")
      expect(result.expiresAt).toBeInstanceOf(Date)

      expect(mockStripeInstance.accountLinks.create).toHaveBeenCalledWith({
        account: "acct_test_123",
        return_url: "https://play14.org/onboarding/return",
        refresh_url: "https://play14.org/onboarding/refresh",
        type: "account_onboarding",
      })
    })
  })

  describe("createLoginLink", () => {
    it("creates a dashboard login link", async () => {
      mockStripeInstance.accounts.createLoginLink.mockResolvedValue({
        url: "https://connect.stripe.com/express/acct_test/login",
      })

      const result = await provider.createLoginLink("acct_test_123")

      expect(result.url).toBe("https://connect.stripe.com/express/acct_test/login")
    })
  })

  describe("getAccount", () => {
    it("retrieves account details", async () => {
      const mockAccount = createMockAccount({
        id: "acct_test_123",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })
      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount)

      const result = await provider.getAccount("acct_test_123")

      expect(result.accountId).toBe("acct_test_123")
      expect(result.chargesEnabled).toBe(true)
      expect(result.payoutsEnabled).toBe(true)
      expect(result.detailsSubmitted).toBe(true)
    })
  })
})

// ============================================================================
// Currency Validation Tests (Exported function)
// ============================================================================

describe("Currency Validation", () => {
  let provider: StripeProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StripeProvider()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const supportedCurrencies = [
    "usd",
    "eur",
    "gbp",
    "jpy",
    "chf",
    "sek",
    "nok",
    "dkk",
    "pln",
    "czk",
    "inr",
    "sgd",
    "mxn",
    "brl",
    "zar",
  ]

  it.each(supportedCurrencies)("accepts %s as valid currency", async (currency) => {
    const mockSession = createMockCheckoutSession()
    mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

    await expect(
      provider.createCheckoutSession({
        orderId: "order-123",
        currency,
        customerEmail: "test@example.com",
        lineItems: [{ name: "Ticket", quantity: 1, unitPrice: 50 }],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })
    ).resolves.toBeDefined()
  })

  const invalidCurrencies = ["xyz", "ab", "abcd", "123", ""]

  it.each(invalidCurrencies)("rejects %s as invalid currency", async (currency) => {
    await expect(
      provider.createCheckoutSession({
        orderId: "order-123",
        currency,
        customerEmail: "test@example.com",
        lineItems: [{ name: "Ticket", quantity: 1, unitPrice: 50 }],
        successUrl: "https://play14.org/success",
        cancelUrl: "https://play14.org/cancel",
      })
    ).rejects.toThrow()
  })
})
