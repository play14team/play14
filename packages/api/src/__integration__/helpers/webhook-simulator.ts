/**
 * Webhook simulation helpers for integration tests
 *
 * Provides utilities for generating and sending Stripe webhook
 * events to test webhook handlers using the mock payment provider.
 */

import type { Server } from "node:http"
import request from "supertest"
import {
  createMockWebhookEvent,
  getMockPaymentState,
  simulateMockCheckoutComplete,
  simulateMockCheckoutExpired,
  simulateMockPaymentFailed,
} from "../../services/payment"

/**
 * Send a webhook event to the Strapi webhook endpoint
 */
export async function sendWebhookEvent(
  httpServer: Server,
  eventType: string,
  data: Record<string, unknown>,
  signature = "mock_signature_valid",
  eventId?: string
): Promise<request.Response> {
  const payload = JSON.stringify({
    id: eventId || `evt_test_${Date.now()}`,
    object: "event",
    type: eventType,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  })

  return request(httpServer)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", signature)
    .set("Content-Type", "application/json")
    .send(payload)
}

/**
 * Simulate and send a checkout.session.completed webhook
 *
 * If the session doesn't exist in mock state (can happen due to module isolation
 * in certain test runners), creates a minimal session entry before completing it.
 */
export async function sendCheckoutCompleted(
  httpServer: Server,
  sessionId: string,
  metadata?: { orderId?: string },
  eventId?: string
): Promise<request.Response> {
  const state = getMockPaymentState()

  // Ensure session exists in mock state - handles module isolation edge cases
  if (!state.sessions.has(sessionId)) {
    const paymentIntentId = `pi_${sessionId.replace("cs_", "")}`
    state.sessions.set(sessionId, {
      id: sessionId,
      url: `https://checkout.stripe.com/c/pay/${sessionId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      metadata: metadata || {},
      customerEmail: "test@example.com",
      amountTotal: 10000,
      currency: "eur",
      paymentIntent: paymentIntentId,
      paymentStatus: "unpaid",
      status: "open",
    })
    state.paymentIntents.set(paymentIntentId, {
      id: paymentIntentId,
      amount: 10000,
      currency: "eur",
      status: "requires_payment_method",
      metadata: {},
    })
  }

  // Update mock state to reflect completed checkout
  simulateMockCheckoutComplete(sessionId)

  // Create and send webhook event
  const { payload: basePayload, signature } = createMockWebhookEvent(
    "checkout.session.completed",
    sessionId
  )

  // If explicit event ID provided, replace the auto-generated one
  let payload = basePayload
  if (eventId) {
    const parsed = JSON.parse(basePayload)
    parsed.id = eventId
    payload = JSON.stringify(parsed)
  }

  return request(httpServer)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", signature)
    .set("Content-Type", "application/json")
    .send(payload)
}

/**
 * Simulate and send a checkout.session.expired webhook
 *
 * If the session doesn't exist in mock state, creates a minimal session entry.
 */
export async function sendCheckoutExpired(
  httpServer: Server,
  sessionId: string,
  metadata?: { orderId?: string },
  eventId?: string
): Promise<request.Response> {
  const state = getMockPaymentState()

  // Ensure session exists in mock state
  if (!state.sessions.has(sessionId)) {
    const paymentIntentId = `pi_${sessionId.replace("cs_", "")}`
    state.sessions.set(sessionId, {
      id: sessionId,
      url: `https://checkout.stripe.com/c/pay/${sessionId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      metadata: metadata || {},
      customerEmail: "test@example.com",
      amountTotal: 10000,
      currency: "eur",
      paymentIntent: paymentIntentId,
      paymentStatus: "unpaid",
      status: "open",
    })
  }

  // Update mock state to reflect expired checkout
  simulateMockCheckoutExpired(sessionId)

  // Create and send webhook event
  const { payload: basePayload, signature } = createMockWebhookEvent(
    "checkout.session.expired",
    sessionId
  )

  // If explicit event ID provided, replace the auto-generated one
  let payload = basePayload
  if (eventId) {
    const parsed = JSON.parse(basePayload)
    parsed.id = eventId
    payload = JSON.stringify(parsed)
  }

  return request(httpServer)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", signature)
    .set("Content-Type", "application/json")
    .send(payload)
}

/**
 * Simulate and send a payment_intent.payment_failed webhook
 *
 * If the session doesn't exist in mock state, creates a minimal session entry.
 */
export async function sendPaymentFailed(
  httpServer: Server,
  sessionId: string,
  errorCode = "card_declined",
  errorMessage = "Your card was declined",
  eventId?: string
): Promise<request.Response> {
  const state = getMockPaymentState()

  // Ensure session exists in mock state
  if (!state.sessions.has(sessionId)) {
    const paymentIntentId = `pi_${sessionId.replace("cs_", "")}`
    state.sessions.set(sessionId, {
      id: sessionId,
      url: `https://checkout.stripe.com/c/pay/${sessionId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      metadata: {},
      customerEmail: "test@example.com",
      amountTotal: 10000,
      currency: "eur",
      paymentIntent: paymentIntentId,
      paymentStatus: "unpaid",
      status: "open",
    })
    state.paymentIntents.set(paymentIntentId, {
      id: paymentIntentId,
      amount: 10000,
      currency: "eur",
      status: "requires_payment_method",
      metadata: {},
    })
  }

  // Update mock state to reflect failed payment
  simulateMockPaymentFailed(sessionId)

  const session = state.sessions.get(sessionId)

  // Create and send webhook event
  const payload = JSON.stringify({
    id: eventId || `evt_test_${Date.now()}`,
    object: "event",
    type: "payment_intent.payment_failed",
    data: {
      object: {
        id: session?.paymentIntent || sessionId,
        object: "payment_intent",
        last_payment_error: {
          code: errorCode,
          message: errorMessage,
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  })

  return request(httpServer)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", "mock_signature_valid")
    .set("Content-Type", "application/json")
    .send(payload)
}

/**
 * Simulate and send a charge.refunded webhook
 */
export async function sendChargeRefunded(
  httpServer: Server,
  paymentIntentId: string,
  amount: number,
  eventId?: string
): Promise<request.Response> {
  const payload = JSON.stringify({
    id: eventId || `evt_test_${Date.now()}`,
    object: "event",
    type: "charge.refunded",
    data: {
      object: {
        id: `ch_test_${Date.now()}`,
        object: "charge",
        payment_intent: paymentIntentId,
        amount_refunded: amount,
        refunded: true,
      },
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  })

  return request(httpServer)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", "mock_signature_valid")
    .set("Content-Type", "application/json")
    .send(payload)
}

/**
 * Simulate and send an account.updated webhook
 */
export async function sendAccountUpdated(
  httpServer: Server,
  accountId: string,
  updates: {
    charges_enabled?: boolean
    payouts_enabled?: boolean
    details_submitted?: boolean
  } = {}
): Promise<request.Response> {
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: "account.updated",
    data: {
      object: {
        id: accountId,
        object: "account",
        charges_enabled: updates.charges_enabled ?? false,
        payouts_enabled: updates.payouts_enabled ?? false,
        details_submitted: updates.details_submitted ?? false,
      },
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  })

  return request(httpServer)
    .post("/api/webhooks/stripe")
    .set("stripe-signature", "mock_signature_valid")
    .set("Content-Type", "application/json")
    .send(payload)
}

/**
 * Helper to wait for database updates after webhook processing
 *
 * Webhooks may trigger async operations, this helps ensure
 * the database state is consistent before assertions.
 */
export async function waitForWebhookProcessing(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
