/**
 * Integration tests for draft order flow (multi-step checkout)
 *
 * Tests: POST /draft → PUT /attendees → POST /checkout → webhook completion
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
  seedTestTicketType,
} from "../../test-utils/seed-database"
import { createAuthenticatedUser, getAuthHeader } from "../helpers/auth"
import { resetMockPaymentState } from "../../services/payment"
import { sendCheckoutCompleted } from "../helpers/webhook-simulator"

describe("Draft Order Flow", () => {
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

  describe("POST /api/ticket-orders/draft", () => {
    it("creates draft order without Stripe session", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Act
      const response = await request(httpServer)
        .post("/api/ticket-orders/draft")
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
        ticketCount: 2,
        requiresAttendeeInfo: true,
      })

      // Verify order is in draft status
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: response.body.data.orderId,
      })
      expect(order.status).toBe("draft")
      expect(order.hasReservation).toBe(false)
      expect(order.providerSessionId).toBeNull()
    })

    it("returns player defaults for attendee prefill", async () => {
      // Arrange
      const { token, player, user } = await createAuthenticatedUser(strapi, {
        email: "john@example.com",
        playerName: "John Doe",
      })
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Act
      const response = await request(httpServer)
        .post("/api/ticket-orders/draft")
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
      expect(response.status).toBe(200)
      expect(response.body.data.playerDefaults).toBeDefined()
      expect(response.body.data.playerDefaults.email).toBe("john@example.com")
    })
  })

  describe("PUT /api/ticket-orders/:orderId/attendees", () => {
    it("saves attendee information", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create draft
      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      const orderId = draftResponse.body.data.orderId

      // Act
      const response = await request(httpServer)
        .put(`/api/ticket-orders/${orderId}/attendees`)
        .set(getAuthHeader(token))
        .send({
          data: {
            attendees: [
              {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                tshirtSize: "L",
                photoConsent: true,
              },
              {
                firstName: "Jane",
                lastName: "Doe",
                email: "jane@example.com",
                tshirtSize: "M",
                photoConsent: false,
              },
            ],
            gdprConsent: true,
            termsAccepted: true,
          },
        })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.readyForCheckout).toBe(true)

      // Verify attendee details saved
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
      })
      expect(order.attendeeDetails).toHaveLength(2)
      expect(order.gdprConsent).toBe(true)
      expect(order.termsAccepted).toBe(true)
    })

    it("validates attendee count matches ticket count", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create draft with 2 tickets
      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      // Act - try to save only 1 attendee
      const response = await request(httpServer)
        .put(`/api/ticket-orders/${draftResponse.body.data.orderId}/attendees`)
        .set(getAuthHeader(token))
        .send({
          data: {
            attendees: [
              { firstName: "John", lastName: "Doe", email: "john@example.com" },
            ],
            gdprConsent: true,
            termsAccepted: true,
          },
        })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain("attendee")
    })

    it("requires GDPR consent", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
            ],
          },
        })

      // Act - no GDPR consent
      const response = await request(httpServer)
        .put(`/api/ticket-orders/${draftResponse.body.data.orderId}/attendees`)
        .set(getAuthHeader(token))
        .send({
          data: {
            attendees: [
              { firstName: "John", lastName: "Doe", email: "john@example.com" },
            ],
            gdprConsent: false,
            termsAccepted: true,
          },
        })

      // Assert
      expect(response.status).toBe(400)
    })
  })

  describe("POST /api/ticket-orders/:orderId/checkout", () => {
    it("creates Stripe session and moves to pending", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create draft
      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      const orderId = draftResponse.body.data.orderId

      // Add attendee info
      await request(httpServer)
        .put(`/api/ticket-orders/${orderId}/attendees`)
        .set(getAuthHeader(token))
        .send({
          data: {
            attendees: [
              { firstName: "John", lastName: "Doe", email: "john@example.com" },
              { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
            ],
            gdprConsent: true,
            termsAccepted: true,
          },
        })

      // Act
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${orderId}/checkout`)
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.checkoutUrl).toContain("checkout.stripe.com")

      // Verify order moved to pending with reservation
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
      })
      expect(order.status).toBe("pending")
      expect(order.hasReservation).toBe(true)
      expect(order.providerSessionId).not.toBeNull()
    })

    it("handles free orders without Stripe", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [], // Will add free ticket type manually
      })

      // Create free ticket type
      const freeTicketType = await seedTestTicketType(strapi, {
        event: event.id,
        name: "Free Entry",
        price: 0,
        capacity: 50,
      })

      // Create draft for free ticket
      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: freeTicketType.documentId, quantity: 1 },
            ],
          },
        })

      const orderId = draftResponse.body.data.orderId

      // Add attendee info
      await request(httpServer)
        .put(`/api/ticket-orders/${orderId}/attendees`)
        .set(getAuthHeader(token))
        .send({
          data: {
            attendees: [
              { firstName: "John", lastName: "Doe", email: "john@example.com" },
            ],
            gdprConsent: true,
            termsAccepted: true,
          },
        })

      // Act
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${orderId}/checkout`)
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.free).toBe(true)

      // Order should be immediately paid for free orders
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
        populate: { tickets: true },
      })
      expect(order.status).toBe("paid")
      expect(order.tickets).toHaveLength(1)
    })

    it("rejects checkout without attendee info", async () => {
      // Arrange
      const { token } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create draft without adding attendee info
      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 1 },
            ],
          },
        })

      // Act - try checkout without attendee info
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${draftResponse.body.data.orderId}/checkout`)
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(400)
    })
  })

  describe("Complete draft order flow with webhook", () => {
    it("completes full draft → attendees → checkout → payment flow", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Step 1: Create draft
      const draftResponse = await request(httpServer)
        .post("/api/ticket-orders/draft")
        .set(getAuthHeader(token))
        .send({
          data: {
            eventId: event.documentId,
            tickets: [
              { ticketTypeId: event.ticketTypes![0].documentId, quantity: 2 },
            ],
          },
        })

      expect(draftResponse.status).toBe(200)
      const orderId = draftResponse.body.data.orderId

      // Step 2: Add attendees
      await request(httpServer)
        .put(`/api/ticket-orders/${orderId}/attendees`)
        .set(getAuthHeader(token))
        .send({
          data: {
            attendees: [
              {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                tshirtSize: "L",
              },
              {
                firstName: "Jane",
                lastName: "Doe",
                email: "jane@example.com",
                tshirtSize: "M",
              },
            ],
            gdprConsent: true,
            termsAccepted: true,
          },
        })

      // Step 3: Finalize checkout
      const checkoutResponse = await request(httpServer)
        .post(`/api/ticket-orders/${orderId}/checkout`)
        .set(getAuthHeader(token))

      expect(checkoutResponse.status).toBe(200)

      // Step 4: Get session ID and simulate payment
      const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
      })
      const sessionId = order.providerSessionId

      // Step 5: Simulate webhook
      const webhookResponse = await sendCheckoutCompleted(
        httpServer,
        sessionId
      )

      expect(webhookResponse.status).toBe(200)

      // Step 6: Verify final state
      const finalOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: orderId,
        populate: { tickets: true },
      })

      expect(finalOrder.status).toBe("paid")
      expect(finalOrder.tickets).toHaveLength(2)

      // Verify attendee info preserved on tickets
      expect(finalOrder.tickets[0].attendeeName).toBeDefined()
      expect(finalOrder.tickets[0].attendeeEmail).toBeDefined()
    })
  })
})
