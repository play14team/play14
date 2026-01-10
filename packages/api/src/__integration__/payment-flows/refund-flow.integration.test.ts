/**
 * Integration tests for refund flow
 *
 * Tests: POST /ticket-orders/:id/refund and charge.refunded webhook
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
  seedPaidOrderWithTickets,
  seedTestOrder,
} from "../../test-utils/seed-database"
import { createAuthenticatedUser, createEventHost, getAuthHeader } from "../helpers/auth"
import { resetMockPaymentState } from "../../services/payment"
import { sendChargeRefunded, waitForWebhookProcessing } from "../helpers/webhook-simulator"

describe("Refund Flow", () => {
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

  describe("POST /api/ticket-orders/:orderId/refund", () => {
    it("processes refund for paid order", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player,
        quantity: 2,
        totalAmount: 100,
      })

      // Act
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${order.documentId}/refund`)
        .set(getAuthHeader(token))
        .send({
          data: { reason: "Customer request" },
        })

      // Assert
      expect(response.status).toBe(200)
    })

    it("rejects refund for non-paid orders", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create pending order (not paid)
      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "pending",
      })

      // Act
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${order.documentId}/refund`)
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(400)
    })

    it("rejects refund for already refunded orders", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Create already refunded order
      const order = await seedTestOrder(strapi, {
        event: event.id,
        player: player.id,
        status: "refunded",
        providerOrderId: `pi_test_${Date.now()}`,
      })

      // Act
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${order.documentId}/refund`)
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(400)
    })

    it("allows hosts to refund attendee orders", async () => {
      // Arrange
      const host = await createEventHost(strapi)
      const attendee = await createAuthenticatedUser(strapi, {
        email: "attendee@example.com",
      })

      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
        hosts: [host.player.id],
      })

      // Create order for attendee
      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player: attendee.player,
        quantity: 1,
        totalAmount: 50,
      })

      // Act - host refunds attendee's order
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${order.documentId}/refund`)
        .set(getAuthHeader(host.token))
        .send({ data: { reason: "Event cancelled" } })

      // Assert
      expect(response.status).toBe(200)
    })

    it("rejects refund by unauthorized users", async () => {
      // Arrange
      const owner = await createAuthenticatedUser(strapi, {
        email: "owner@example.com",
      })
      const unauthorized = await createAuthenticatedUser(strapi, {
        email: "unauthorized@example.com",
      })

      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player: owner.player,
        quantity: 1,
        totalAmount: 50,
      })

      // Act - unauthorized user tries to refund
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${order.documentId}/refund`)
        .set(getAuthHeader(unauthorized.token))

      // Assert
      expect(response.status).toBe(403)
    })

    it("requires authentication", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player,
        quantity: 1,
        totalAmount: 50,
      })

      // Act - no auth header
      const response = await request(httpServer)
        .post(`/api/ticket-orders/${order.documentId}/refund`)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe("Refund via Stripe Dashboard (charge.refunded webhook)", () => {
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

      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player,
        quantity: 2,
        totalAmount: 100,
      })

      // Act - simulate refund from Stripe dashboard
      const response = await sendChargeRefunded(
        httpServer,
        order.providerOrderId!,
        10000 // Amount in cents
      )

      // Assert
      expect(response.status).toBe(200)

      await waitForWebhookProcessing()

      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order.documentId,
        populate: { tickets: true },
      })

      expect(updatedOrder.status).toBe("refunded")
      expect(updatedOrder.tickets).toHaveLength(2)
      expect(updatedOrder.tickets.every((t: any) => t.ticketStatus === "refunded")).toBe(true)
    })

    it("handles partial refund", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player,
        quantity: 2,
        totalAmount: 100,
      })

      // Act - simulate partial refund (50% of total)
      const response = await sendChargeRefunded(
        httpServer,
        order.providerOrderId!,
        5000 // Half the amount
      )

      // Assert
      expect(response.status).toBe(200)

      await waitForWebhookProcessing()

      const updatedOrder = await strapi.documents("api::ticket-order.ticket-order").findOne({
        documentId: order.documentId,
      })

      // Partial refund should mark as partially_refunded
      expect(["partially_refunded", "refunded"]).toContain(updatedOrder.status)
    })
  })

  describe("Refund side effects", () => {
    it("updates ticket type sold count", async () => {
      // Arrange
      const { player } = await createAuthenticatedUser(strapi)
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
      })

      // Set initial sold count
      await strapi.db.connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .update({ sold_count: 10 })

      const order = await seedPaidOrderWithTickets(strapi, {
        event,
        player,
        quantity: 2,
        totalAmount: 100,
      })

      // Act
      await sendChargeRefunded(httpServer, order.providerOrderId!, 10000)
      await waitForWebhookProcessing()

      // Assert - sold count should be decremented
      const ticketType = await strapi.db.connection("ticket_types")
        .where("document_id", event.ticketTypes![0].documentId)
        .first()

      expect(ticketType.sold_count).toBe(8) // 10 - 2
    })
  })
})
