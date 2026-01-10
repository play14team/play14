/**
 * Integration tests for direct checkout payment flow
 *
 * Tests the complete flow: POST /api/ticket-orders → Stripe checkout → webhook completion
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
import { cleanupTestData, seedTestEvent } from "../../test-utils/seed-database"
import { createAuthenticatedUser, getAuthHeader } from "../helpers/auth"
import { resetMockPaymentState } from "../../services/payment"
import { sendCheckoutCompleted } from "../helpers/webhook-simulator"

describe("Direct Checkout Flow", () => {
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

  describe("POST /api/ticket-orders", () => {
    it("creates order and returns checkout URL", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Early Bird", price: 50, capacity: 100 },
        ],
      })

      // Act
      const response = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        orderId: expect.any(String),
        orderNumber: expect.stringMatching(/^P14-/),
        checkoutUrl: expect.stringContaining("checkout.stripe.com"),
        expiresAt: expect.any(String),
      })

      // Verify order was created in database
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: response.body.data.orderId,
      })
      expect(order).not.toBeNull()
      expect(order.status).toBe("pending")
      expect(order.hasReservation).toBe(true)
    })

    it("rejects order when event is not open", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Passed",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Regular", price: 75, capacity: 50 },
        ],
      })

      // Act
      const response = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
            ],
          },
        })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it("rejects order when tickets sold out", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Limited", price: 100, capacity: 1 },
        ],
      })

      // Sell out the ticket type
      await strapi.db.connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .update({ sold_count: 1 })

      // Act
      const response = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
            ],
          },
        })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it("requires authentication", async () => {
      // Arrange
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Regular", price: 50, capacity: 100 },
        ],
      })

      // Act - no auth header
      const response = await request(httpServer)
        .post("/api/ticket-orders")
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
            ],
          },
        })

      // Assert
      expect(response.status).toBe(401)
    })

    it("validates ticket quantity bounds", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Regular", price: 50, capacity: 100 },
        ],
      })

      // Act - request too many tickets
      const response = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 101 },
            ],
          },
        })

      // Assert
      expect(response.status).toBe(400)
    })

    it("handles multiple ticket types in one order", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Early Bird", price: 50, capacity: 100 },
          { name: "Regular", price: 75, capacity: 50 },
        ],
      })

      // Act
      const response = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
              { ticketTypeId: event.ticketTypes![1].documentId, quantity: 2 },
            ],
          },
        })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.orderId).toBeDefined()

      // Verify order has correct ticket details
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: response.body.data.orderId,
      })
      expect(order.ticketDetails).toHaveLength(2)
    })
  })

  describe("GET /api/events/:eventId/tickets", () => {
    it("returns available ticket types without authentication", async () => {
      // Arrange
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Early Bird", price: 50, capacity: 100 },
          { name: "Regular", price: 75, capacity: 50 },
        ],
      })

      // Act
      const response = await request(httpServer)
        .get(`/api/events/${event.documentId}/tickets`)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.ticketTypes).toHaveLength(2)
      expect(response.body.data.ticketTypes[0]).toMatchObject({
        name: expect.any(String),
        price: expect.any(Number),
        available: expect.any(Number),
      })
    })

    it("excludes inactive ticket types", async () => {
      // Arrange
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Active", price: 50, capacity: 100, isActive: true },
          { name: "Inactive", price: 25, capacity: 50, isActive: false },
        ],
      })

      // Act
      const response = await request(httpServer)
        .get(`/api/events/${event.documentId}/tickets`)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.ticketTypes).toHaveLength(1)
      expect(response.body.data.ticketTypes[0].name).toBe("Active")
    })
  })

  describe("Full checkout flow with webhook", () => {
    it("completes order when webhook received", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Step 1: Create order
      const orderResponse = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      expect(orderResponse.status).toBe(200)
      const orderId = orderResponse.body.data.orderId

      // Step 2: Get the checkout session ID from the order
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
      })
      const sessionId = order.providerSessionId

      // Step 3: Simulate successful payment via webhook
      const webhookResponse = await sendCheckoutCompleted(
        httpServer,
        sessionId
      )

      expect(webhookResponse.status).toBe(200)

      // Step 4: Verify order state
      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
        populate: { tickets: true },
      })

      expect(updatedOrder.status).toBe("paid")
      expect(updatedOrder.paidAt).not.toBeNull()
      expect(updatedOrder.tickets).toHaveLength(2)
      expect(updatedOrder.hasReservation).toBe(false)

      // Step 5: Verify ticket type sold count updated
      const ticketType = await strapi.db.connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .first()
      expect(ticketType.sold_count).toBe(2)
    })
  })

  describe("GET /api/ticket-orders/:orderId", () => {
    it("returns order status", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create order
      const orderResponse = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
            ],
          },
        })

      const orderId = orderResponse.body.data.orderId

      // Act
      const response = await request(httpServer)
        .get(`/api/ticket-orders/${orderId}`)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        orderNumber: expect.stringMatching(/^P14-/),
        status: "pending",
      })
    })
  })

  describe("POST /api/ticket-orders/:orderId/cancel", () => {
    it("cancels pending order and releases reservations", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create order
      const orderResponse = await request(httpServer)
        .post("/api/ticket-orders")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      const orderId = orderResponse.body.data.orderId

      // Verify reservation exists
      const ticketTypeBefore = await strapi.db.connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .first()
      expect(ticketTypeBefore.reserved_count).toBe(2)

      // Act - requires authentication after security fix
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${orderId}/cancel`)
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(200)

      // Verify order cancelled
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
      })
      expect(order.status).toBe("cancelled")

      // Verify reservations released
      const ticketTypeAfter = await strapi.db.connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .first()
      expect(ticketTypeAfter.reserved_count).toBe(0)
    })
  })
})
