/**
 * Stripe mock service for integration tests
 *
 * Provides a mock Stripe SDK that tracks state and allows
 * simulating various payment scenarios without making real API calls.
 */

import { type Mock, vi } from "vitest"
import {
  type MockAccount,
  type MockCheckoutSession,
  type MockPaymentIntent,
  type MockRefund,
  createMockAccount,
  createMockCheckoutSession,
  createMockPaymentIntent,
  createMockRefund,
} from "./factories/stripe"

export interface StripeMockState {
  sessions: Map<string, MockCheckoutSession>
  paymentIntents: Map<string, MockPaymentIntent>
  refunds: Map<string, MockRefund>
  accounts: Map<string, MockAccount>
}

export interface StripeMock {
  mockStripe: MockStripeSDK
  state: StripeMockState
  reset: () => void
}

interface MockStripeSDK {
  checkout: {
    sessions: {
      create: Mock
      retrieve: Mock
    }
  }
  paymentIntents: {
    retrieve: Mock
    create: Mock
  }
  refunds: {
    create: Mock
  }
  accounts: {
    create: Mock
    retrieve: Mock
  }
  accountLinks: {
    create: Mock
  }
  webhooks: {
    constructEvent: Mock
  }
}

let sessionCounter = 0

/**
 * Create a mock Stripe SDK with state management
 *
 * @example
 * ```ts
 * const { mockStripe, state, reset } = createStripeMock()
 *
 * // Use mockStripe in place of real Stripe SDK
 * vi.mock("stripe", () => ({ default: vi.fn(() => mockStripe) }))
 *
 * // Simulate a completed checkout
 * simulateCheckoutComplete(state, "cs_test_123")
 * ```
 */
export function createStripeMock(): StripeMock {
  const state: StripeMockState = {
    sessions: new Map(),
    paymentIntents: new Map(),
    refunds: new Map(),
    accounts: new Map(),
  }

  const mockStripe: MockStripeSDK = {
    checkout: {
      sessions: {
        create: vi.fn(async (params: any) => {
          sessionCounter++
          const sessionId = `cs_test_${sessionCounter}_${Date.now()}`
          const paymentIntentId = `pi_test_${sessionCounter}_${Date.now()}`

          const lineItems = params.line_items || []
          const totalAmount = lineItems.reduce(
            (sum: number, item: any) =>
              sum + (item.price_data?.unit_amount || 0) * (item.quantity || 1),
            0
          )

          const session = createMockCheckoutSession({
            id: sessionId,
            url: `https://checkout.stripe.com/c/pay/${sessionId}`,
            metadata: params.metadata || {},
            customer_email: params.customer_email || null,
            amount_total: totalAmount,
            currency: params.line_items?.[0]?.price_data?.currency || "eur",
            payment_intent: totalAmount > 0 ? paymentIntentId : null,
          })

          state.sessions.set(sessionId, session)

          // Create associated payment intent if amount > 0
          if (totalAmount > 0) {
            const pi = createMockPaymentIntent({
              id: paymentIntentId,
              amount: totalAmount,
              currency: session.currency,
              status: "requires_payment_method",
              metadata: params.metadata || {},
            })
            state.paymentIntents.set(paymentIntentId, pi)
          }

          return session
        }),

        retrieve: vi.fn(async (sessionId: string) => {
          return state.sessions.get(sessionId) || null
        }),
      },
    },

    paymentIntents: {
      retrieve: vi.fn(async (piId: string) => {
        return state.paymentIntents.get(piId) || null
      }),

      create: vi.fn(async (params: any) => {
        const pi = createMockPaymentIntent({
          id: `pi_test_${Date.now()}`,
          amount: params.amount,
          currency: params.currency,
          metadata: params.metadata || {},
        })
        state.paymentIntents.set(pi.id, pi)
        return pi
      }),
    },

    refunds: {
      create: vi.fn(async (params: any) => {
        const refund = createMockRefund({
          id: `re_test_${Date.now()}`,
          payment_intent: params.payment_intent,
          amount: params.amount,
          status: "succeeded",
        })
        state.refunds.set(refund.id, refund)
        return refund
      }),
    },

    accounts: {
      create: vi.fn(async (params: any) => {
        const account = createMockAccount({
          id: `acct_test_${Date.now()}`,
          country: params.country || "FR",
          metadata: params.metadata || {},
        })
        state.accounts.set(account.id, account)
        return account
      }),

      retrieve: vi.fn(async (accountId: string) => {
        return state.accounts.get(accountId) || null
      }),
    },

    accountLinks: {
      create: vi.fn(async (params: any) => {
        return {
          object: "account_link",
          url: `https://connect.stripe.com/setup/e/${params.account}/test`,
          expires_at: Math.floor(Date.now() / 1000) + 300,
        }
      }),
    },

    webhooks: {
      constructEvent: vi.fn((payload: string, _signature: string, secret: string) => {
        // Verify secret matches expected test secret
        if (secret !== "whsec_test_secret_for_testing") {
          const error = new Error("Invalid signature") as Error & { type: string }
          error.type = "StripeSignatureVerificationError"
          throw error
        }

        // Parse and return the payload
        return JSON.parse(payload)
      }),
    },
  }

  const reset = () => {
    state.sessions.clear()
    state.paymentIntents.clear()
    state.refunds.clear()
    state.accounts.clear()
    sessionCounter = 0

    // Reset all mocks
    vi.clearAllMocks()
  }

  return { mockStripe, state, reset }
}

/**
 * Simulate a successful checkout completion
 *
 * Updates the session and payment intent states to reflect a completed payment,
 * and returns a webhook event payload that can be sent to the webhook endpoint.
 */
export function simulateCheckoutComplete(
  state: StripeMockState,
  sessionId: string
): { type: string; data: { object: MockCheckoutSession } } {
  const session = state.sessions.get(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  // Update session state
  session.payment_status = "paid"
  session.status = "complete"

  // Update payment intent state
  if (session.payment_intent) {
    const pi = state.paymentIntents.get(session.payment_intent)
    if (pi) {
      pi.status = "succeeded"
    }
  }

  return {
    type: "checkout.session.completed",
    data: { object: session },
  }
}

/**
 * Simulate a checkout session expiration
 */
export function simulateCheckoutExpired(
  state: StripeMockState,
  sessionId: string
): { type: string; data: { object: MockCheckoutSession } } {
  const session = state.sessions.get(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  session.status = "expired"
  session.expires_at = Math.floor(Date.now() / 1000) - 60

  return {
    type: "checkout.session.expired",
    data: { object: session },
  }
}

/**
 * Simulate a payment failure
 */
export function simulatePaymentFailed(
  state: StripeMockState,
  sessionId: string,
  errorCode = "card_declined",
  errorMessage = "Your card was declined"
): { type: string; data: { object: any } } {
  const session = state.sessions.get(sessionId)
  if (!session || !session.payment_intent) {
    throw new Error(`Session or payment intent not found: ${sessionId}`)
  }

  const pi = state.paymentIntents.get(session.payment_intent)
  if (pi) {
    pi.status = "requires_payment_method"
  }

  return {
    type: "payment_intent.payment_failed",
    data: {
      object: {
        id: session.payment_intent,
        object: "payment_intent",
        last_payment_error: {
          code: errorCode,
          message: errorMessage,
        },
      },
    },
  }
}

/**
 * Simulate a charge refund
 */
export function simulateChargeRefunded(
  paymentIntentId: string,
  amount: number
): { type: string; data: { object: any } } {
  return {
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
  }
}

/**
 * Simulate a Stripe Connect account update
 */
export function simulateAccountUpdated(
  state: StripeMockState,
  accountId: string,
  updates: Partial<MockAccount> = {}
): { type: string; data: { object: MockAccount } } {
  let account = state.accounts.get(accountId)

  if (!account) {
    // Create account if it doesn't exist
    account = createMockAccount({ id: accountId })
    state.accounts.set(accountId, account)
  }

  // Apply updates
  Object.assign(account, updates)

  return {
    type: "account.updated",
    data: { object: account },
  }
}

/**
 * Create a webhook payload with proper structure for testing
 */
export function createWebhookPayload(eventType: string, data: Record<string, unknown>): string {
  return JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: eventType,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  })
}
