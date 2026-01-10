/**
 * Integration tests for Stripe webhook handlers
 *
 * Tests various webhook events: checkout completed, expired, payment failed, refunded
 *
 * Prerequisites:
 * - Test database container running: `podman-compose up play14-db-test`
 * - Strapi built: `bun --filter play14-api build`
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import request from "supertest"
import type { Core } from "@strapi/strapi"
import {
  setupStrapiTestInstance,
  teardownStrapiTestInstance,
  getHttpServer,
} from "../../test-utils/strapi-test-instance"
import {
  cleanupTestData,
  seedTestEvent,
  seedTestOrder,
  seedPaidOrderWithTickets,
} from "../../test-utils/seed-database"
import { createAuthenticatedUser } from "../helpers/auth"
import {
  resetMockPaymentState,
  getMockPaymentState,
} from "../../services/payment"
import {
  sendCheckoutCompleted,
  sendCheckoutExpired,
  sendPaymentFailed,
  sendChargeRefunded,
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
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
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
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
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
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Set initial reservation count
      await strapi.db.connection("ticket_types")
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
      const ticketType = await strapi.db.connection("ticket_types")
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
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
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
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
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

  describe("Webhook signature verification", () => {
    it("rejects webhooks with invalid signature", async () => {
      // Act
      const response = await request(httpServer)
        .post("/api/webhooks/stripe")
        .set("stripe-signature", "invalid_signature")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({
          type: "checkout.session.completed",
          data: { object: {} },
        }))

      // Assert - should fail signature verification
      expect(response.status).toBe(400)
    })

    it("rejects webhooks without signature header", async () => {
      // Act
      const response = await request(httpServer)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({
          type: "checkout.session.completed",
          data: { object: {} },
        }))

      // Assert
      expect(response.status).toBe(400)
    })
  })
})
