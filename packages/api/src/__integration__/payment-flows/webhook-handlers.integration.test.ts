/**
 * Integration tests for Stripe webhook handlers
 *
 * Tests various webhook events: checkout completed, expired, payment failed, refunded
 *
 * Prerequisites:
 * - Test database container running: `podman-compose up play14-db-test`
 * - Strapi built: `bun --filter play14-api build`
 */

import type { Core } from "@strapi/strapi"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { getMockPaymentState, resetMockPaymentState } from "../../services/payment"
import {
  cleanupTestData,
  seedPaidOrderWithTickets,
  seedTestEvent,
  seedTestOrder,
} from "../../test-utils/seed-database"
import {
  getHttpServer,
  setupStrapiTestInstance,
  teardownStrapiTestInstance,
} from "../../test-utils/strapi-test-instance"
import { createAuthenticatedUser } from "../helpers/auth"
import {
  sendChargeRefunded,
  sendCheckoutCompleted,
  sendCheckoutExpired,
  sendPaymentFailed,
  waitForWebhookProcessing,
} from "../helpers/webhook-simulator"

describe("Webhook Handlers", () => {
  let strapi: Core.Strapi
  let httpServer: any

  beforeAll(async () => {
    strapi = await setupStrapiTestInstance()
    httpServer = getHttpServer()
  }, 60000)

  afterAll(async () => {
    await teardownStrapiTestInstance()
  })

  beforeEach(async () => {
    await cleanupTestData(strapi)
    resetMockPaymentState()
  })

  describe("checkout.session.completed", () => {
    it("creates tickets and updates order status", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      // Create pending order with reservation
      const sessionId = `cs_test_${Date.now()}`
      const paymentIntentId = `pi_test_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        totalAmount: 100,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2, unitPrice: 50 },
        ],
      })

      // Add session to mock state
      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 10000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 10000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act
      const response = await sendCheckoutCompleted(httpServer, sessionId)

      // Assert
      expect(response.status).toBe(200)

      await waitForWebhookProcessing()

      // Verify order updated
      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order.documentId,
        populate: { tickets: true },
      })

      expect(updatedOrder.status).toBe("paid")
      expect(updatedOrder.paidAt).not.toBeNull()
      expect(updatedOrder.tickets).toHaveLength(2)
      expect(updatedOrder.hasReservation).toBe(false)
    })

    it("is idempotent - handles duplicate webhooks", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId = `cs_test_idempotent_${Date.now()}`
      const paymentIntentId = `pi_test_idempotent_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 10000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 10000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act - send webhook twice
      await sendCheckoutCompleted(httpServer, sessionId)
      await waitForWebhookProcessing()

      const secondResponse = await sendCheckoutCompleted(httpServer, sessionId)

      // Assert - second call should succeed (idempotent)
      expect(secondResponse.status).toBe(200)

      // Verify no duplicate tickets
      const tickets = await strapi.documents("api::ticket.ticket").findMany({
        filters: { order: { documentId: order.documentId } },
      })
      expect(tickets).toHaveLength(2) // Not 4
    })
  })

  describe("checkout.session.expired", () => {
    it("releases reservations and marks order expired", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      // Set initial reservation count
      await strapi.db
        .connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .update({ reserved_count: 5 })

      const sessionId = `cs_test_expire_${Date.now()}`
      const paymentIntentId = `pi_test_expire_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 10000,
        currency: "eur",
      })

      // Act
      const response = await sendCheckoutExpired(httpServer, sessionId)

      // Assert
      expect(response.status).toBe(200)

      await waitForWebhookProcessing()

      // Verify order expired
      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order.documentId,
      })
      expect(updatedOrder.status).toBe("expired")
      expect(updatedOrder.hasReservation).toBe(false)

      // Verify reservations released (5 - 2 = 3)
      const ticketType = await strapi.db
        .connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .first()
      expect(ticketType.reserved_count).toBe(3)
    })
  })

  describe("payment_intent.payment_failed", () => {
    it("marks order as failed and releases reservations", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId = `cs_test_fail_${Date.now()}`
      const paymentIntentId = `pi_test_fail_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1, unitPrice: 50 },
        ],
      })

      // Set up mock state
      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 5000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 5000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act
      const response = await sendPaymentFailed(
        httpServer,
        sessionId,
        "card_declined",
        "Your card was declined"
      )

      // Assert
      expect(response.status).toBe(200)

      await waitForWebhookProcessing()

      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order.documentId,
      })
      expect(updatedOrder.status).toBe("failed")
      expect(updatedOrder.hasReservation).toBe(false)
    })
  })

  describe("charge.refunded", () => {
    it("marks order and tickets as refunded", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      // Create paid order with tickets
      const paidOrder = await seedPaidOrderWithTickets(strapi, {
        event,
        player,
        quantity: 2,
        totalAmount: 100,
      })

      const paymentIntentId = paidOrder.providerOrderId!

      // Act
      const response = await sendChargeRefunded(
        httpServer,
        paymentIntentId,
        10000 // Amount in cents
      )

      // Assert
      expect(response.status).toBe(200)

      await waitForWebhookProcessing()

      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: paidOrder.documentId,
        populate: { tickets: true },
      })

      expect(updatedOrder.status).toBe("refunded")
      expect(updatedOrder.tickets.every((t: any) => t.ticketStatus === "refunded")).toBe(true)
    })
  })

  describe("Event-level idempotency", () => {
    it("records processed events in processed_webhooks table", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId = `cs_test_record_${Date.now()}`
      const paymentIntentId = `pi_test_record_${Date.now()}`
      const eventId = `evt_test_record_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 5000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 5000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act
      await sendCheckoutCompleted(httpServer, sessionId, undefined, eventId)
      await waitForWebhookProcessing()

      // Assert - verify event recorded in processed_webhooks table
      const processedWebhook = await strapi.db
        .connection("processed_webhooks")
        .where("event_id", eventId)
        .first()

      expect(processedWebhook).toBeDefined()
      expect(processedWebhook.event_id).toBe(eventId)
      expect(processedWebhook.event_type).toBe("checkout.session.completed")
      expect(processedWebhook.provider).toBe("stripe")
      expect(processedWebhook.status).toBe("completed")
    })

    it("prevents duplicate processing with same event ID across different sessions", async () => {
      // This tests the event-level idempotency rather than order-level
      // Even if someone sends a webhook with the same event ID for a different session,
      // it should be rejected
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId1 = `cs_test_dup1_${Date.now()}`
      const sessionId2 = `cs_test_dup2_${Date.now()}`
      const paymentIntentId1 = `pi_test_dup1_${Date.now()}`
      const paymentIntentId2 = `pi_test_dup2_${Date.now()}`
      const sharedEventId = `evt_test_shared_${Date.now()}`

      // Create two orders
      const order1 = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId1,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1, unitPrice: 50 },
        ],
      })

      const order2 = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId2,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      // Set up session 1
      mockState.sessions.set(sessionId1, {
        id: sessionId1,
        url: `https://checkout.stripe.com/pay/${sessionId1}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order1.documentId },
        paymentIntent: paymentIntentId1,
        amountTotal: 5000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId1, {
        id: paymentIntentId1,
        amount: 5000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })
      // Set up session 2
      mockState.sessions.set(sessionId2, {
        id: sessionId2,
        url: `https://checkout.stripe.com/pay/${sessionId2}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order2.documentId },
        paymentIntent: paymentIntentId2,
        amountTotal: 5000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId2, {
        id: paymentIntentId2,
        amount: 5000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act - send webhook for session 1 with shared event ID
      const response1 = await sendCheckoutCompleted(
        httpServer,
        sessionId1,
        undefined,
        sharedEventId
      )
      await waitForWebhookProcessing()

      // Act - try to send webhook for session 2 with the SAME event ID
      // Reset session 2 to open state since simulateMockCheckoutComplete was called
      mockState.sessions.set(sessionId2, {
        id: sessionId2,
        url: `https://checkout.stripe.com/pay/${sessionId2}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order2.documentId },
        paymentIntent: paymentIntentId2,
        amountTotal: 5000,
        currency: "eur",
      })
      const response2 = await sendCheckoutCompleted(
        httpServer,
        sessionId2,
        undefined,
        sharedEventId
      )

      // Assert - both should return 200 (idempotent)
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(response2.body.duplicate).toBe(true)

      // Only order 1 should be paid
      const updatedOrder1 = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order1.documentId,
      })
      const updatedOrder2 = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order2.documentId,
      })

      expect(updatedOrder1.status).toBe("paid")
      expect(updatedOrder2.status).toBe("pending") // Not processed due to duplicate event ID
    })

    it("handles concurrent webhook deliveries with same event ID", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId = `cs_test_concurrent_${Date.now()}`
      const paymentIntentId = `pi_test_concurrent_${Date.now()}`
      const eventId = `evt_test_concurrent_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 10000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 10000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act - send 3 concurrent webhooks with the same event ID
      const responses = await Promise.all([
        sendCheckoutCompleted(httpServer, sessionId, undefined, eventId),
        sendCheckoutCompleted(httpServer, sessionId, undefined, eventId),
        sendCheckoutCompleted(httpServer, sessionId, undefined, eventId),
      ])

      await waitForWebhookProcessing()

      // Assert - all should return 200
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Exactly 2 tickets should be created (not 6)
      const tickets = await strapi.documents("api::ticket.ticket").findMany({
        filters: { order: { documentId: order.documentId } },
      })
      expect(tickets).toHaveLength(2)

      // Only one processed_webhooks entry
      const processedCount = await strapi.db
        .connection("processed_webhooks")
        .where("event_id", eventId)
        .count("* as count")
        .first()
      expect(Number(processedCount.count)).toBe(1)
    })

    it("records failed events with error metadata", async () => {
      // Arrange - create an order that will fail processing
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId = `cs_test_fail_record_${Date.now()}`
      const paymentIntentId = `pi_test_fail_record_${Date.now()}`
      const eventId = `evt_test_fail_record_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 5000,
        currency: "eur",
      })

      // Act - send payment failed webhook
      const response = await sendPaymentFailed(
        httpServer,
        sessionId,
        "card_declined",
        "Your card was declined",
        eventId
      )

      await waitForWebhookProcessing()

      // Assert
      expect(response.status).toBe(200)

      // Verify event recorded
      const processedWebhook = await strapi.db
        .connection("processed_webhooks")
        .where("event_id", eventId)
        .first()

      expect(processedWebhook).toBeDefined()
      expect(processedWebhook.event_type).toBe("payment_intent.payment_failed")
      expect(processedWebhook.status).toBe("completed")
    })

    it("different event types with different IDs are processed independently", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [{ name: "Standard", price: 50, capacity: 100 }],
      })

      const sessionId = `cs_test_multi_${Date.now()}`
      const paymentIntentId = `pi_test_multi_${Date.now()}`
      const completedEventId = `evt_test_completed_${Date.now()}`
      const failedEventId = `evt_test_failed_${Date.now()}`

      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
        providerSessionId: sessionId,
        hasReservation: true,
        ticketDetails: [
          { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1, unitPrice: 50 },
        ],
      })

      const mockState = getMockPaymentState()
      mockState.sessions.set(sessionId, {
        id: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: new Date(Date.now() + 1800000),
        paymentStatus: "unpaid",
        status: "open",
        customerEmail: "test@example.com",
        metadata: { orderId: order.documentId },
        paymentIntent: paymentIntentId,
        amountTotal: 5000,
        currency: "eur",
      })
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 5000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })

      // Act - send checkout completed
      await sendCheckoutCompleted(httpServer, sessionId, undefined, completedEventId)
      await waitForWebhookProcessing()

      // Try to send a payment failed with different event ID (should process but order already paid)
      // Reset mock state for the payment intent (simulate a retry scenario)
      mockState.paymentIntents.set(paymentIntentId, {
        id: paymentIntentId,
        amount: 5000,
        currency: "eur",
        status: "requires_payment_method",
        metadata: {},
      })
      await sendPaymentFailed(httpServer, sessionId, "card_declined", "Declined", failedEventId)
      await waitForWebhookProcessing()

      // Assert - both events should be recorded
      const completedRecord = await strapi.db
        .connection("processed_webhooks")
        .where("event_id", completedEventId)
        .first()
      const failedRecord = await strapi.db
        .connection("processed_webhooks")
        .where("event_id", failedEventId)
        .first()

      expect(completedRecord).toBeDefined()
      expect(failedRecord).toBeDefined()
      expect(completedRecord.event_type).toBe("checkout.session.completed")
      expect(failedRecord.event_type).toBe("payment_intent.payment_failed")
    })
  })

  describe("Webhook signature verification", () => {
    it("rejects webhooks with invalid signature", async () => {
      // Act
      const response = await request(httpServer)
        .post("/api/webhooks/stripe")
        .set("stripe-signature", "invalid_signature")
        .set("Content-Type", "application/json")
        .send(
          JSON.stringify({
            type: "checkout.session.completed",
            data: { object: {} },
          })
        )

      // Assert - should fail signature verification
      expect(response.status).toBe(400)
    })

    it("rejects webhooks without signature header", async () => {
      // Act
      const response = await request(httpServer)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(
          JSON.stringify({
            type: "checkout.session.completed",
            data: { object: {} },
          })
        )

      // Assert
      expect(response.status).toBe(400)
    })
  })
})
