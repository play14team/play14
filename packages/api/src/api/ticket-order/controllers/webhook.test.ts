/**
 * Unit tests for webhook controller
 */

import { type Mock, beforeEach, describe, expect, it, vi } from "vitest"
import webhookFactory from "./webhook"

// Mock dependencies
vi.mock("../../../libs/calendar", () => ({
  generateEventICS: vi.fn().mockResolvedValue("BEGIN:VCALENDAR\nEND:VCALENDAR"),
  generateGoogleCalendarUrl: vi.fn().mockReturnValue("https://calendar.google.com/test"),
  generateOutlookCalendarUrl: vi.fn().mockReturnValue("https://outlook.live.com/test"),
}))

vi.mock("../../../libs/tickets", () => ({
  generateTicketCode: vi.fn().mockReturnValue("TIX-TEST-1234"),
}))

vi.mock("../../../services/payment", () => ({
  getPaymentProvider: vi.fn(),
}))

vi.mock("../../../services/ticketing", () => ({
  confirmReservations: vi.fn().mockResolvedValue(undefined),
  releaseReservations: vi.fn().mockResolvedValue(undefined),
  confirmDiscountCode: vi.fn().mockResolvedValue(undefined),
  releaseDiscountCode: vi.fn().mockResolvedValue(undefined),
  findOrCreatePlayerForAttendee: vi
    .fn()
    .mockResolvedValue({ player: { id: 1, documentId: "test-player-123" }, isNew: false }),
  addPlayerToEventAttendees: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../../../services/webhook", () => ({
  claimWebhookEvent: vi.fn().mockResolvedValue({ shouldProcess: true, alreadyProcessed: false }),
  markWebhookCompleted: vi.fn().mockResolvedValue(undefined),
  markWebhookFailed: vi.fn().mockResolvedValue(undefined),
  releaseWebhookClaim: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("slugify", () => ({
  default: vi.fn((str: string) => str.toLowerCase().replace(/\s+/g, "-")),
}))

import { generateTicketCode } from "../../../libs/tickets"
import { getPaymentProvider } from "../../../services/payment"
import {
  confirmDiscountCode,
  confirmReservations,
  releaseReservations,
} from "../../../services/ticketing"
import {
  claimWebhookEvent,
  markWebhookCompleted,
  markWebhookFailed,
  releaseWebhookClaim,
} from "../../../services/webhook"

// Helper to create mock Knex query builder
function createMockKnexQueryBuilder(resolveValue: any = [{ id: 1 }]) {
  const builder: any = {
    where: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    increment: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(resolveValue[0] || null),
    then: vi.fn((cb) => Promise.resolve(resolveValue).then(cb)),
  }
  return builder
}

// Helper to create mock strapi instance
function createMockStrapi() {
  const mockEmailSend = vi.fn().mockResolvedValue(undefined)
  const mockKnexBuilder = createMockKnexQueryBuilder()

  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    documents: vi.fn().mockReturnValue({
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }),
    db: {
      connection: vi.fn().mockReturnValue(mockKnexBuilder),
    },
    plugin: vi.fn().mockReturnValue({
      service: vi.fn().mockReturnValue({
        send: mockEmailSend,
      }),
    }),
    _mockEmailSend: mockEmailSend,
    _mockKnexBuilder: mockKnexBuilder,
  } as any
}

// Helper to create mock context
function createMockContext(overrides: Partial<any> = {}) {
  return {
    request: {
      headers: {
        "stripe-signature": "test-signature",
      },
      body: {
        [Symbol.for("unparsedBody")]: JSON.stringify({ type: "test" }),
        ...overrides.body,
      },
    },
    send: vi.fn().mockReturnValue({ received: true }),
    badRequest: vi.fn().mockReturnValue({ error: "Bad request" }),
    ...overrides,
  }
}

describe("webhook controller", () => {
  let mockStrapi: ReturnType<typeof createMockStrapi>
  let controller: ReturnType<typeof webhookFactory>
  let mockProvider: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockStrapi = createMockStrapi()
    controller = webhookFactory({ strapi: mockStrapi })

    mockProvider = {
      verifyWebhookSignature: vi.fn(),
    }
    ;(getPaymentProvider as Mock).mockReturnValue(mockProvider)
  })

  describe("handleStripeWebhook", () => {
    it("returns bad request when signature header is missing", async () => {
      const ctx = createMockContext({
        request: {
          headers: {},
          body: { [Symbol.for("unparsedBody")]: "{}" },
        },
      })

      await controller.handleStripeWebhook(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Missing signature")
      expect(mockStrapi.log.warn).toHaveBeenCalledWith("[Webhook] Missing Stripe signature header")
    })

    it("returns bad request when raw body is not available", async () => {
      const ctx = createMockContext({
        request: {
          headers: { "stripe-signature": "test-sig" },
          body: {}, // No unparsedBody
        },
      })

      await controller.handleStripeWebhook(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith(
        "Webhook signature verification failed: raw body unavailable"
      )
      expect(mockStrapi.log.error).toHaveBeenCalled()
    })

    it("verifies signature and routes checkout.session.completed event", async () => {
      const ctx = createMockContext()
      const sessionData = { id: "cs_test_123" }

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: sessionData,
      })

      // Mock handleCheckoutCompleted
      controller.handleCheckoutCompleted = vi.fn().mockResolvedValue(undefined)

      await controller.handleStripeWebhook(ctx)

      expect(mockProvider.verifyWebhookSignature).toHaveBeenCalled()
      expect(claimWebhookEvent).toHaveBeenCalledWith(
        mockStrapi,
        "evt_test_123",
        "checkout.session.completed"
      )
      expect(controller.handleCheckoutCompleted).toHaveBeenCalledWith(sessionData)
      expect(markWebhookCompleted).toHaveBeenCalledWith(mockStrapi, "evt_test_123")
      expect(ctx.send).toHaveBeenCalledWith({ received: true })
    })

    it("returns success without processing when event already processed", async () => {
      const ctx = createMockContext()

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_duplicate_123",
        type: "checkout.session.completed",
        data: { id: "cs_test_123" },
      })

      // Mock that event was already processed
      ;(claimWebhookEvent as Mock).mockResolvedValueOnce({
        shouldProcess: false,
        alreadyProcessed: true,
        status: "completed",
      })

      controller.handleCheckoutCompleted = vi.fn()

      await controller.handleStripeWebhook(ctx)

      expect(controller.handleCheckoutCompleted).not.toHaveBeenCalled()
      expect(ctx.send).toHaveBeenCalledWith({ received: true, duplicate: true })
    })

    it("verifies signature and routes checkout.session.expired event", async () => {
      const ctx = createMockContext()
      const sessionData = { id: "cs_test_expired" }

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_expired_123",
        type: "checkout.session.expired",
        data: sessionData,
      })

      controller.handleCheckoutExpired = vi.fn().mockResolvedValue(undefined)

      await controller.handleStripeWebhook(ctx)

      expect(controller.handleCheckoutExpired).toHaveBeenCalledWith(sessionData)
      expect(ctx.send).toHaveBeenCalledWith({ received: true })
    })

    it("verifies signature and routes payment_intent.payment_failed event", async () => {
      const ctx = createMockContext()
      const paymentData = { id: "pi_test_failed" }

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_failed_123",
        type: "payment_intent.payment_failed",
        data: paymentData,
      })

      controller.handlePaymentFailed = vi.fn().mockResolvedValue(undefined)

      await controller.handleStripeWebhook(ctx)

      expect(controller.handlePaymentFailed).toHaveBeenCalledWith(paymentData)
      expect(ctx.send).toHaveBeenCalledWith({ received: true })
    })

    it("verifies signature and routes charge.refunded event", async () => {
      const ctx = createMockContext()
      const chargeData = { id: "ch_test", payment_intent: "pi_test" }

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_refund_123",
        type: "charge.refunded",
        data: chargeData,
      })

      controller.handleChargeRefunded = vi.fn().mockResolvedValue(undefined)

      await controller.handleStripeWebhook(ctx)

      expect(controller.handleChargeRefunded).toHaveBeenCalledWith(chargeData)
      expect(ctx.send).toHaveBeenCalledWith({ received: true })
    })

    it("verifies signature and routes account.updated event", async () => {
      const ctx = createMockContext()
      const accountData = { id: "acct_test" }

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_account_123",
        type: "account.updated",
        data: accountData,
      })

      controller.handleAccountUpdated = vi.fn().mockResolvedValue(undefined)

      await controller.handleStripeWebhook(ctx)

      expect(controller.handleAccountUpdated).toHaveBeenCalledWith(accountData)
      expect(ctx.send).toHaveBeenCalledWith({ received: true })
    })

    it("logs unhandled event types", async () => {
      const ctx = createMockContext()

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_unhandled_123",
        type: "some.unhandled.event",
        data: {},
      })

      await controller.handleStripeWebhook(ctx)

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "[Webhook] Unhandled event type: some.unhandled.event"
      )
      expect(ctx.send).toHaveBeenCalledWith({ received: true })
    })

    it("returns bad request when signature verification fails", async () => {
      const ctx = createMockContext()

      mockProvider.verifyWebhookSignature.mockRejectedValue(new Error("Invalid signature"))

      await controller.handleStripeWebhook(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Webhook verification failed")
      expect(mockStrapi.log.error).toHaveBeenCalled()
    })

    it("releases claim and returns 500 for retryable errors", async () => {
      const ctx = createMockContext()

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_retry_123",
        type: "checkout.session.completed",
        data: { id: "cs_test_123" },
      })

      // Mock a retryable database error
      const dbError = new Error("Connection refused")
      ;(dbError as any).code = "ECONNREFUSED"
      controller.handleCheckoutCompleted = vi.fn().mockRejectedValue(dbError)

      await controller.handleStripeWebhook(ctx)

      expect(releaseWebhookClaim).toHaveBeenCalledWith(mockStrapi, "evt_retry_123")
      expect(ctx.status).toBe(500)
      expect(ctx.send).toHaveBeenCalledWith({ error: "Processing failed, will retry" })
    })

    it("marks failed and returns 200 for non-retryable errors", async () => {
      const ctx = createMockContext()

      mockProvider.verifyWebhookSignature.mockResolvedValue({
        id: "evt_fail_123",
        type: "checkout.session.completed",
        data: { id: "cs_test_123" },
      })

      // Mock a non-retryable validation error
      const validationError = new Error("Invalid attendee email format")
      controller.handleCheckoutCompleted = vi.fn().mockRejectedValue(validationError)

      await controller.handleStripeWebhook(ctx)

      expect(markWebhookFailed).toHaveBeenCalledWith(
        mockStrapi,
        "evt_fail_123",
        "Invalid attendee email format"
      )
      expect(ctx.send).toHaveBeenCalledWith({
        received: true,
        error: "Invalid attendee email format",
      })
    })
  })

  describe("isRetryableError", () => {
    it("returns true for ECONNREFUSED errors", () => {
      const error = new Error("Connection refused")
      ;(error as any).code = "ECONNREFUSED"
      expect(controller.isRetryableError(error)).toBe(true)
    })

    it("returns true for ETIMEDOUT errors", () => {
      const error = new Error("Connection timed out")
      ;(error as any).code = "ETIMEDOUT"
      expect(controller.isRetryableError(error)).toBe(true)
    })

    it("returns true for PostgreSQL deadlock errors (40P01)", () => {
      const error = new Error("Deadlock detected")
      ;(error as any).code = "40P01"
      expect(controller.isRetryableError(error)).toBe(true)
    })

    it("returns true for PostgreSQL serialization errors (40001)", () => {
      const error = new Error("Serialization failure")
      ;(error as any).code = "40001"
      expect(controller.isRetryableError(error)).toBe(true)
    })

    it("returns true for network errors", () => {
      const error = new Error("network request failed")
      expect(controller.isRetryableError(error)).toBe(true)
    })

    it("returns true for timeout errors in message", () => {
      const error = new Error("Request timeout after 30s")
      expect(controller.isRetryableError(error)).toBe(true)
    })

    it("returns false for email/SMTP errors", () => {
      const error = new Error("SMTP connection failed")
      expect(controller.isRetryableError(error)).toBe(false)
    })

    it("returns false for email sending errors", () => {
      const error = new Error("Failed to send email to user")
      expect(controller.isRetryableError(error)).toBe(false)
    })

    it("returns false for validation errors", () => {
      const error = new Error("Invalid email format")
      expect(controller.isRetryableError(error)).toBe(false)
    })

    it("returns false for Invalid data errors", () => {
      const error = new Error("Invalid attendee data")
      expect(controller.isRetryableError(error)).toBe(false)
    })

    it("returns true for unknown errors (default to retryable)", () => {
      const error = new Error("Something unexpected happened")
      expect(controller.isRetryableError(error)).toBe(true)
    })
  })

  describe("handleCheckoutCompleted", () => {
    const mockEvent = {
      id: 1,
      documentId: "event-doc-123",
      name: "Test Event",
      slug: "test-event",
      start: "2025-03-14T09:00:00Z",
      end: "2025-03-16T17:00:00Z",
      contactEmail: "test@play14.org",
      ticketTypes: [{ id: 1, documentId: "tt-123", name: "Standard" }],
    }

    const mockOrder = {
      id: 1,
      documentId: "order-doc-123",
      orderNumber: "ORD-001",
      status: "pending",
      purchaserName: "John Doe",
      purchaserEmail: "john@example.com",
      event: mockEvent,
      player: { id: 1, documentId: "player-doc-123" },
      ticketDetails: [{ ticketTypeId: "tt-123", quantity: 1 }],
      attendeeDetails: [],
      currency: "EUR",
      totalAmount: 50,
    }

    beforeEach(() => {
      const mockDocuments = mockStrapi.documents()
      mockDocuments.findFirst.mockResolvedValue(mockOrder)
      mockDocuments.findOne.mockResolvedValue({
        ...mockOrder.player,
        attended: [],
      })
      mockDocuments.create.mockResolvedValue({
        ticketCode: "TIX-TEST-1234",
      })
      mockDocuments.update.mockResolvedValue({})

      // Reset documents mock to return fresh mocks per call
      mockStrapi.documents.mockImplementation((type: string) => {
        if (type === "api::ticket-order.ticket-order") {
          return {
            findFirst: vi.fn().mockResolvedValue(mockOrder),
            update: vi.fn().mockResolvedValue({}),
          }
        }
        if (type === "api::ticket.ticket") {
          return {
            create: vi.fn().mockResolvedValue({ ticketCode: "TIX-TEST-1234" }),
          }
        }
        if (type === "api::player.player") {
          return {
            findOne: vi.fn().mockResolvedValue({
              ...mockOrder.player,
              attended: [],
            }),
            update: vi.fn().mockResolvedValue({}),
          }
        }
        return {
          findFirst: vi.fn(),
          findMany: vi.fn(),
          findOne: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        }
      })
    })

    it("returns early when session ID is missing", async () => {
      await controller.handleCheckoutCompleted({})

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        "[Webhook] Missing session ID in checkout.session.completed"
      )
    })

    it("returns early when order is not found", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue(null),
      })

      await controller.handleCheckoutCompleted({ id: "cs_test_123" })

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        "[Webhook] Order not found for session: cs_test_123"
      )
    })

    it("returns early when order is already processed", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          ...mockOrder,
          status: "paid",
        }),
      })

      // Mock Knex to return 0 rows updated (indicating order is already processed)
      const knexBuilder = {
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockResolvedValue(0), // 0 rows updated = already processed
      }
      mockStrapi.db.connection = vi.fn().mockReturnValue(knexBuilder)

      await controller.handleCheckoutCompleted({ id: "cs_test_123" })

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("skipped - current status: paid")
      )
    })

    it("creates tickets and updates order status on successful checkout", async () => {
      const ticketOrderDocs = {
        findFirst: vi.fn().mockResolvedValue(mockOrder),
        update: vi.fn().mockResolvedValue({}),
      }
      const ticketDocs = {
        create: vi.fn().mockResolvedValue({ ticketCode: "TIX-TEST-1234" }),
      }
      const playerDocs = {
        findOne: vi.fn().mockResolvedValue({
          ...mockOrder.player,
          attended: [],
        }),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockImplementation((type: string) => {
        if (type === "api::ticket-order.ticket-order") return ticketOrderDocs
        if (type === "api::ticket.ticket") return ticketDocs
        if (type === "api::player.player") return playerDocs
        return {}
      })

      // Mock sendConfirmationEmail
      controller.sendConfirmationEmail = vi.fn().mockResolvedValue(undefined)
      controller.sendTicketSoldNotificationEmail = vi.fn().mockResolvedValue(undefined)
      controller.addPlayerToEventAttendees = vi.fn().mockResolvedValue(undefined)

      await controller.handleCheckoutCompleted({
        id: "cs_test_123",
        payment_intent: "pi_test_123",
      })

      // Verify ticket was created
      expect(ticketDocs.create).toHaveBeenCalled()
      expect(generateTicketCode).toHaveBeenCalled()

      // Verify order status was updated
      expect(ticketOrderDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockOrder.documentId,
          data: expect.objectContaining({
            status: "paid",
            providerOrderId: "pi_test_123",
          }),
        })
      )

      // Verify reservations were confirmed
      expect(confirmReservations).toHaveBeenCalled()

      // Verify confirmation email was sent
      expect(controller.sendConfirmationEmail).toHaveBeenCalled()

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("completed successfully")
      )
    })

    it("confirms discount code usage when present", async () => {
      const orderWithDiscount = {
        ...mockOrder,
        discountCode: {
          documentId: "dc-123",
          code: "SAVE10",
          usedCount: 5,
        },
        hasReservation: true,
      }

      mockStrapi.documents.mockImplementation((type: string) => {
        if (type === "api::ticket-order.ticket-order") {
          return {
            findFirst: vi.fn().mockResolvedValue(orderWithDiscount),
            update: vi.fn().mockResolvedValue({}),
          }
        }
        if (type === "api::ticket.ticket") {
          return {
            create: vi.fn().mockResolvedValue({ ticketCode: "TIX-TEST" }),
          }
        }
        if (type === "api::player.player") {
          return {
            findOne: vi.fn().mockResolvedValue({ attended: [] }),
            update: vi.fn().mockResolvedValue({}),
          }
        }
        return {}
      })

      controller.sendConfirmationEmail = vi.fn().mockResolvedValue(undefined)
      controller.sendTicketSoldNotificationEmail = vi.fn().mockResolvedValue(undefined)
      controller.addPlayerToEventAttendees = vi.fn().mockResolvedValue(undefined)

      await controller.handleCheckoutCompleted({
        id: "cs_test_123",
        payment_intent: "pi_test_123",
      })

      // Should call confirmDiscountCode with the discount code documentId and hasReservation flag
      expect(confirmDiscountCode).toHaveBeenCalledWith(mockStrapi, "dc-123", true)
    })
  })

  describe("handleCheckoutExpired", () => {
    it("returns early when session ID is missing", async () => {
      await controller.handleCheckoutExpired({})

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        "[Webhook] Missing session ID in checkout.session.expired"
      )
    })

    it("returns early when order is not found", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue(null),
      })

      await controller.handleCheckoutExpired({ id: "cs_expired_123" })

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("No order found for expired session")
      )
    })

    it("skips expiration when order is not pending", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          orderNumber: "ORD-001",
          status: "paid",
        }),
      })

      await controller.handleCheckoutExpired({ id: "cs_expired_123" })

      expect(mockStrapi.log.info).toHaveBeenCalledWith(expect.stringContaining("not pending"))
    })

    it("releases reservations and marks order as expired", async () => {
      const mockOrder = {
        documentId: "order-doc-123",
        orderNumber: "ORD-001",
        status: "pending",
        event: { id: 1 },
      }

      const orderDocs = {
        findFirst: vi.fn().mockResolvedValue(mockOrder),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockReturnValue(orderDocs)

      await controller.handleCheckoutExpired({ id: "cs_expired_123" })

      expect(releaseReservations).toHaveBeenCalledWith(mockStrapi, mockOrder.documentId)

      expect(orderDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockOrder.documentId,
          data: { status: "expired" },
        })
      )

      expect(mockStrapi.log.info).toHaveBeenCalledWith(expect.stringContaining("marked as expired"))
    })
  })

  describe("handlePaymentFailed", () => {
    it("returns early when payment intent ID is missing", async () => {
      await controller.handlePaymentFailed({})

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        "[Webhook] Missing payment intent ID in payment_intent.payment_failed"
      )
    })

    it("returns early when order is not found", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue(null),
      })

      await controller.handlePaymentFailed({ id: "pi_failed_123" })

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("No order found for failed payment intent")
      )
    })

    it("releases reservations and marks order as failed", async () => {
      const mockOrder = {
        documentId: "order-doc-123",
        orderNumber: "ORD-001",
        status: "pending",
        purchaserEmail: "john@example.com",
        event: { name: "Test Event", slug: "test-event" },
      }

      const orderDocs = {
        findFirst: vi.fn().mockResolvedValue(mockOrder),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockReturnValue(orderDocs)

      controller.sendPaymentFailedEmail = vi.fn().mockResolvedValue(undefined)

      await controller.handlePaymentFailed({
        id: "pi_failed_123",
        last_payment_error: {
          code: "card_declined",
          message: "Your card was declined",
        },
      })

      expect(releaseReservations).toHaveBeenCalledWith(mockStrapi, mockOrder.documentId)

      expect(orderDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockOrder.documentId,
          data: expect.objectContaining({
            status: "failed",
            notes: expect.stringContaining("card_declined"),
          }),
        })
      )

      expect(controller.sendPaymentFailedEmail).toHaveBeenCalled()
    })

    it("does not update order if not pending", async () => {
      const mockOrder = {
        documentId: "order-doc-123",
        orderNumber: "ORD-001",
        status: "paid", // Already paid
        event: { name: "Test Event" },
      }

      const orderDocs = {
        findFirst: vi.fn().mockResolvedValue(mockOrder),
        update: vi.fn(),
      }

      mockStrapi.documents.mockReturnValue(orderDocs)

      await controller.handlePaymentFailed({ id: "pi_failed_123" })

      expect(orderDocs.update).not.toHaveBeenCalled()
      expect(releaseReservations).not.toHaveBeenCalled()
    })
  })

  describe("handleChargeRefunded", () => {
    it("returns early when payment intent is missing", async () => {
      await controller.handleChargeRefunded({})

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        "[Webhook] Missing payment_intent in charge.refunded"
      )
    })

    it("returns early when order is not found", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue(null),
      })

      await controller.handleChargeRefunded({ payment_intent: "pi_test" })

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining("Order not found for payment intent")
      )
    })

    it("skips if order is already refunded", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue({
          orderNumber: "ORD-001",
          status: "refunded",
        }),
      })

      await controller.handleChargeRefunded({ payment_intent: "pi_test" })

      expect(mockStrapi.log.info).toHaveBeenCalledWith(expect.stringContaining("already refunded"))
    })

    it("updates order and tickets to refunded status", async () => {
      const mockOrder = {
        documentId: "order-doc-123",
        orderNumber: "ORD-001",
        status: "paid",
        tickets: [{ documentId: "ticket-1" }, { documentId: "ticket-2" }],
        player: { documentId: "player-doc-123" },
        event: { documentId: "event-doc-123" },
      }

      const orderDocs = {
        findFirst: vi.fn().mockResolvedValue(mockOrder),
        update: vi.fn().mockResolvedValue({}),
      }
      const ticketDocs = {
        update: vi.fn().mockResolvedValue({}),
      }
      const playerDocs = {
        findOne: vi.fn().mockResolvedValue({
          attended: [
            { id: 1, documentId: "event-doc-123" },
            { id: 2, documentId: "other-event" },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockImplementation((type: string) => {
        if (type === "api::ticket-order.ticket-order") return orderDocs
        if (type === "api::ticket.ticket") return ticketDocs
        if (type === "api::player.player") return playerDocs
        return {}
      })

      await controller.handleChargeRefunded({
        payment_intent: "pi_test",
        amount_refunded: 5000, // $50 in cents
      })

      // Order updated to refunded
      expect(orderDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockOrder.documentId,
          data: expect.objectContaining({
            status: "refunded",
            refundAmount: 50,
          }),
        })
      )

      // All tickets updated to refunded
      expect(ticketDocs.update).toHaveBeenCalledTimes(2)

      // Player removed from event attendees
      expect(playerDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "player-doc-123",
          data: expect.objectContaining({
            attended: [2], // Only the other event remains
          }),
        })
      )

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining("refunded via Stripe dashboard")
      )
    })
  })

  describe("handleAccountUpdated", () => {
    it("returns early when account ID is missing", async () => {
      await controller.handleAccountUpdated({})

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        "[Webhook] Missing account ID in account.updated"
      )
    })

    it("returns early when stripe account is not found", async () => {
      mockStrapi.documents.mockReturnValue({
        findFirst: vi.fn().mockResolvedValue(null),
      })

      await controller.handleAccountUpdated({ id: "acct_test" })

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining("Stripe account not found")
      )
    })

    it("updates account status to active when charges and payouts enabled", async () => {
      const mockAccount = {
        documentId: "stripe-account-doc-123",
        stripeAccountId: "acct_test",
        onboardingCompletedAt: null,
      }

      const accountDocs = {
        findFirst: vi.fn().mockResolvedValue(mockAccount),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockReturnValue(accountDocs)

      await controller.handleAccountUpdated({
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })

      expect(accountDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockAccount.documentId,
          data: expect.objectContaining({
            accountStatus: "active",
            chargesEnabled: true,
            payoutsEnabled: true,
            detailsSubmitted: true,
            onboardingCompletedAt: expect.any(String),
          }),
        })
      )
    })

    it("updates account status to restricted when details submitted but not enabled", async () => {
      const mockAccount = {
        documentId: "stripe-account-doc-123",
        stripeAccountId: "acct_test",
      }

      const accountDocs = {
        findFirst: vi.fn().mockResolvedValue(mockAccount),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockReturnValue(accountDocs)

      await controller.handleAccountUpdated({
        id: "acct_test",
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
      })

      expect(accountDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountStatus: "restricted",
          }),
        })
      )
    })

    it("updates account status to pending when nothing submitted", async () => {
      const mockAccount = {
        documentId: "stripe-account-doc-123",
        stripeAccountId: "acct_test",
      }

      const accountDocs = {
        findFirst: vi.fn().mockResolvedValue(mockAccount),
        update: vi.fn().mockResolvedValue({}),
      }

      mockStrapi.documents.mockReturnValue(accountDocs)

      await controller.handleAccountUpdated({
        id: "acct_test",
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      })

      expect(accountDocs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountStatus: "pending",
          }),
        })
      )
    })
  })

  // Note: findOrCreatePlayerForAttendee tests moved to player-service.test.ts
  // The function is now in the shared ticketing service

  describe("sendConfirmationEmail", () => {
    it("sends email with ticket details", async () => {
      const order = {
        purchaserEmail: "buyer@example.com",
        orderNumber: "ORD-001",
        currency: "EUR",
        totalAmount: 100,
        event: {
          name: "Test Event",
          slug: "test-event",
          start: "2025-03-14T09:00:00Z",
          end: "2025-03-16T17:00:00Z",
          eventStatus: "Open",
        },
      }

      const tickets = [
        {
          ticketCode: "TIX-001",
          ticketTypeName: "Standard",
          attendeeName: "John Doe",
          attendeeEmail: "john@example.com",
        },
      ]

      await controller.sendConfirmationEmail(order, tickets)

      expect(mockStrapi._mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@example.com",
          subject: expect.stringContaining("Test Event"),
          text: expect.stringContaining("TIX-001"),
          html: expect.stringContaining("TIX-001"),
        })
      )
    })

    it("handles email sending failure gracefully", async () => {
      mockStrapi._mockEmailSend.mockRejectedValueOnce(new Error("SMTP error"))

      const order = {
        purchaserEmail: "buyer@example.com",
        orderNumber: "ORD-001",
        currency: "EUR",
        totalAmount: 100,
        event: {
          name: "Test Event",
          slug: "test-event",
          start: "2025-03-14T09:00:00Z",
          end: "2025-03-16T17:00:00Z",
        },
      }

      // Should not throw - just await and check it completes
      await controller.sendConfirmationEmail(order, [])

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining("ALERT: Failed to send confirmation email")
      )
    })
  })

  describe("sendPaymentFailedEmail", () => {
    it("sends payment failed notification email", async () => {
      const order = {
        purchaserEmail: "buyer@example.com",
        orderNumber: "ORD-001",
        event: { name: "Test Event", slug: "test-event" },
      }

      await controller.sendPaymentFailedEmail(order, "Card declined")

      expect(mockStrapi._mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@example.com",
          subject: expect.stringContaining("Payment failed"),
          text: expect.stringContaining("Card declined"),
          html: expect.stringContaining("Card declined"),
        })
      )
    })

    it("handles email sending failure gracefully", async () => {
      mockStrapi._mockEmailSend.mockRejectedValueOnce(new Error("SMTP error"))

      const order = {
        purchaserEmail: "buyer@example.com",
        orderNumber: "ORD-001",
        event: { name: "Test Event" },
      }

      // Should not throw - just await and check it completes
      await controller.sendPaymentFailedEmail(order, "Error")

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send payment failed email")
      )
    })
  })

  // Note: addPlayerToEventAttendees tests moved to player-service.test.ts
  // The function is now in the shared ticketing service
})
