/**
 * Integration tests for Stripe Connect functionality
 *
 * Tests connected account management and destination charges
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
  seedStripeAccount,
} from "../../test-utils/seed-database"
import { createAuthenticatedUser, createEventHost, getAuthHeader } from "../helpers/auth"
import { resetMockPaymentState } from "../../services/payment"
import { sendAccountUpdated } from "../helpers/webhook-simulator"

describe("Stripe Connect Integration", () => {
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

  describe("Event with Connected Account", () => {
    it("creates checkout with destination charges for active account", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const host = await createEventHost(strapi)

      // Create active Stripe account
      const stripeAccount = await seedStripeAccount(strapi, {
        stripeAccountId: "acct_test_connected",
        accountStatus: "active",
        chargesEnabled: true,
        payoutsEnabled: true,
        player: host.player.id,
      })

      // Create event with Stripe account linked
      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
        hosts: [host.player.id],
      })

      // Link stripe account to event
      await strapi.documents("api::event.event").update({
        documentId: event.documentId,
        data: { stripeAccount: stripeAccount.id },
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
      expect(response.status).toBe(200)
      expect(response.body.data.checkoutUrl).toContain("checkout.stripe.com")
    })

    it("falls back to platform account when host account is pending", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)
      const host = await createEventHost(strapi)

      // Create pending Stripe account (not yet active)
      const stripeAccount = await seedStripeAccount(strapi, {
        stripeAccountId: "acct_test_pending",
        accountStatus: "pending",
        chargesEnabled: false,
        payoutsEnabled: false,
        player: host.player.id,
      })

      const event = await seedTestEvent(strapi, {
        eventStatus: "Open",
        ticketingMode: "internal",
        ticketTypes: [
          { name: "Standard", price: 50, capacity: 100 },
        ],
        hosts: [host.player.id],
      })

      await strapi.documents("api::event.event").update({
        documentId: event.documentId,
        data: { stripeAccount: stripeAccount.id },
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

      // Assert - should still work, falling back to platform
      expect(response.status).toBe(200)
    })
  })

  describe("account.updated webhook", () => {
    it("updates account status in database when activated", async () => {
      // Arrange
      const host = await createEventHost(strapi)

      // Create pending account
      const stripeAccount = await seedStripeAccount(strapi, {
        stripeAccountId: "acct_test_activate",
        accountStatus: "pending",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        player: host.player.id,
      })

      // Act - simulate account activation via webhook
      const response = await sendAccountUpdated(
        httpServer,
        "acct_test_activate",
        {
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
        }
      )

      // Assert
      expect(response.status).toBe(200)

      // Verify account updated in database
      const updatedAccount = await strapi.documents("api::stripe-account.stripe-account").findFirst({
        filters: { stripeAccountId: "acct_test_activate" },
      })

      expect(updatedAccount.accountStatus).toBe("active")
      expect(updatedAccount.chargesEnabled).toBe(true)
      expect(updatedAccount.payoutsEnabled).toBe(true)
    })

    it("updates account to restricted when partially complete", async () => {
      // Arrange
      const host = await createEventHost(strapi)

      await seedStripeAccount(strapi, {
        stripeAccountId: "acct_test_restrict",
        accountStatus: "pending",
        chargesEnabled: false,
        payoutsEnabled: false,
        player: host.player.id,
      })

      // Act - simulate partial completion
      const response = await sendAccountUpdated(
        httpServer,
        "acct_test_restrict",
        {
          charges_enabled: true,
          payouts_enabled: false, // Not fully enabled
          details_submitted: true,
        }
      )

      // Assert
      expect(response.status).toBe(200)

      const updatedAccount = await strapi.documents("api::stripe-account.stripe-account").findFirst({
        filters: { stripeAccountId: "acct_test_restrict" },
      })

      expect(updatedAccount.accountStatus).toBe("restricted")
    })
  })

  describe("Stripe Connect Account Management Routes", () => {
    it("GET /stripe/connect/status returns account status", async () => {
      // Arrange
      const { token, player } = await createAuthenticatedUser(strapi)

      // Create and link account to player
      const stripeAccount = await seedStripeAccount(strapi, {
        stripeAccountId: "acct_test_status",
        accountStatus: "active",
        chargesEnabled: true,
        payoutsEnabled: true,
        player: player.id,
      })

      // Link player to account
      await strapi.documents("api::player.player").update({
        documentId: player.documentId,
        data: { stripeAccount: stripeAccount.id },
      })

      // Act
      const response = await request(httpServer)
        .get("/api/stripe/connect/status")
        .set(getAuthHeader(token))

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        stripeAccountId: "acct_test_status",
        accountStatus: "active",
      })
    })
  })
})
