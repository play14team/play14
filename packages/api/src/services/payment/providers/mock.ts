/**
 * Mock Payment Provider for Integration Tests
 *
 * This provider is used automatically when NODE_ENV=test.
 * It simulates Stripe behavior without making real API calls.
 */

import type {
  AccountLink,
  CheckoutSession,
  ConnectAccount,
  ConnectPaymentProvider,
  CreateCheckoutSessionParams,
  CreateCheckoutWithConnectParams,
  CreateConnectAccountParams,
  RefundParams,
  RefundResult,
  WebhookEvent,
} from "../types"

interface MockCheckoutSession {
  id: string
  url: string
  expiresAt: Date
  metadata: Record<string, string>
  customerEmail: string | null
  amountTotal: number
  currency: string
  paymentIntent: string | null
  paymentStatus: "paid" | "unpaid" | "no_payment_required"
  status: "open" | "complete" | "expired"
}

interface MockPaymentIntent {
  id: string
  amount: number
  currency: string
  status: "requires_payment_method" | "succeeded" | "requires_action" | "processing"
  metadata: Record<string, string>
}

interface MockAccount {
  id: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  country: string
  defaultCurrency: string
}

interface MockRefund {
  id: string
  paymentIntent: string
  amount: number
  status: "succeeded" | "pending" | "failed"
}

/**
 * Global mock state - accessible for test assertions and manipulation
 */
export interface MockPaymentState {
  sessions: Map<string, MockCheckoutSession>
  paymentIntents: Map<string, MockPaymentIntent>
  refunds: Map<string, MockRefund>
  accounts: Map<string, MockAccount>
}

// Use global state to ensure it's shared across module instances
// This is necessary because vitest and Strapi might load different module instances
declare global {
  var __mockPaymentState: MockPaymentState | undefined
  var __mockSessionCounter: number | undefined
}

/**
 * Get or create the mock state instance
 * Uses global to ensure state is shared even if module is loaded multiple times
 */
export function getMockPaymentState(): MockPaymentState {
  if (!globalThis.__mockPaymentState) {
    globalThis.__mockPaymentState = {
      sessions: new Map(),
      paymentIntents: new Map(),
      refunds: new Map(),
      accounts: new Map(),
    }
  }
  return globalThis.__mockPaymentState
}

function incrementSessionCounter(): number {
  globalThis.__mockSessionCounter = (globalThis.__mockSessionCounter || 0) + 1
  return globalThis.__mockSessionCounter
}

/**
 * Reset mock state - call this in beforeEach of tests
 */
export function resetMockPaymentState(): void {
  const state = getMockPaymentState()
  state.sessions.clear()
  state.paymentIntents.clear()
  state.refunds.clear()
  state.accounts.clear()
  globalThis.__mockSessionCounter = 0
}

/**
 * Simulate a successful checkout completion
 */
export function simulateMockCheckoutComplete(sessionId: string): void {
  const state = getMockPaymentState()
  const session = state.sessions.get(sessionId)
  if (!session) {
    throw new Error(`Mock session not found: ${sessionId}`)
  }

  session.paymentStatus = "paid"
  session.status = "complete"

  if (session.paymentIntent) {
    const pi = state.paymentIntents.get(session.paymentIntent)
    if (pi) {
      pi.status = "succeeded"
    }
  }
}

/**
 * Simulate a checkout session expiration
 */
export function simulateMockCheckoutExpired(sessionId: string): void {
  const state = getMockPaymentState()
  const session = state.sessions.get(sessionId)
  if (!session) {
    throw new Error(`Mock session not found: ${sessionId}`)
  }

  session.status = "expired"
  session.expiresAt = new Date(Date.now() - 60000)
}

/**
 * Simulate a payment failure
 */
export function simulateMockPaymentFailed(sessionId: string): void {
  const state = getMockPaymentState()
  const session = state.sessions.get(sessionId)
  if (!session || !session.paymentIntent) {
    throw new Error(`Mock session or payment intent not found: ${sessionId}`)
  }

  const pi = state.paymentIntents.get(session.paymentIntent)
  if (pi) {
    pi.status = "requires_payment_method"
  }
}

/**
 * Create a mock webhook event for testing
 */
export function createMockWebhookEvent(
  type: string,
  sessionId: string,
  additionalData: Record<string, unknown> = {}
): { payload: string; signature: string } {
  const state = getMockPaymentState()
  const session = state.sessions.get(sessionId)

  let eventData: Record<string, unknown>

  if (type === "checkout.session.completed" || type === "checkout.session.expired") {
    if (!session) {
      throw new Error(`Mock session not found: ${sessionId}`)
    }
    eventData = {
      id: session.id,
      object: "checkout.session",
      payment_status: session.paymentStatus,
      status: session.status,
      payment_intent: session.paymentIntent,
      metadata: session.metadata,
      customer_email: session.customerEmail,
      amount_total: session.amountTotal,
      currency: session.currency,
      ...additionalData,
    }
  } else if (type === "payment_intent.payment_failed") {
    const pi = session?.paymentIntent ? state.paymentIntents.get(session.paymentIntent) : null
    eventData = {
      id: pi?.id || sessionId,
      object: "payment_intent",
      last_payment_error: {
        code: "card_declined",
        message: "Your card was declined",
      },
      ...additionalData,
    }
  } else {
    eventData = { id: sessionId, ...additionalData }
  }

  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: "event",
    type,
    data: { object: eventData },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
  })

  return {
    payload,
    signature: "mock_signature_valid",
  }
}

/**
 * Mock Payment Provider Implementation
 */
export class MockPaymentProvider implements ConnectPaymentProvider {
  private state: MockPaymentState

  constructor() {
    this.state = getMockPaymentState()
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const counter = incrementSessionCounter()
    const sessionId = `cs_test_${counter}_${Date.now()}`
    const paymentIntentId = `pi_test_${counter}_${Date.now()}`

    const totalAmount = params.lineItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    const session: MockCheckoutSession = {
      id: sessionId,
      url: `https://checkout.stripe.com/c/pay/${sessionId}`,
      expiresAt,
      metadata: params.metadata || {},
      customerEmail: params.customerEmail || null,
      amountTotal: totalAmount,
      currency: params.currency,
      paymentIntent: totalAmount > 0 ? paymentIntentId : null,
      paymentStatus: totalAmount > 0 ? "unpaid" : "no_payment_required",
      status: "open",
    }

    this.state.sessions.set(sessionId, session)

    // Create associated payment intent if amount > 0
    if (totalAmount > 0) {
      const pi: MockPaymentIntent = {
        id: paymentIntentId,
        amount: totalAmount,
        currency: params.currency,
        status: "requires_payment_method",
        metadata: params.metadata || {},
      }
      this.state.paymentIntents.set(paymentIntentId, pi)
    }

    return {
      sessionId,
      sessionUrl: session.url,
      expiresAt,
    }
  }

  async createCheckoutSessionWithConnect(
    params: CreateCheckoutWithConnectParams
  ): Promise<CheckoutSession> {
    // Same as regular checkout but we could track connected account if needed
    return this.createCheckoutSession(params)
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    const refundId = `re_test_${Date.now()}`

    // Find the payment intent to get amount if not specified
    let amount = params.amount
    if (!amount) {
      // Find session with this payment intent
      for (const session of this.state.sessions.values()) {
        if (session.paymentIntent === params.providerOrderId) {
          amount = session.amountTotal
          break
        }
      }
      // Fallback to checking payment intents directly
      if (!amount) {
        const pi = this.state.paymentIntents.get(params.providerOrderId)
        amount = pi?.amount || 0
      }
    }

    const refund: MockRefund = {
      id: refundId,
      paymentIntent: params.providerOrderId,
      amount: amount || 0,
      status: "succeeded",
    }

    this.state.refunds.set(refundId, refund)

    return {
      refundId,
      amount: refund.amount,
      status: "succeeded",
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<WebhookEvent> {
    // In test mode, accept mock signatures
    if (signature !== "mock_signature_valid") {
      throw new Error("Invalid webhook signature")
    }

    const event = JSON.parse(payload)
    return {
      id: event.id,
      type: event.type,
      data: event.data.object,
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<"paid" | "pending" | "failed"> {
    const pi = this.state.paymentIntents.get(providerOrderId)
    if (!pi) {
      // Check sessions
      for (const session of this.state.sessions.values()) {
        if (session.paymentIntent === providerOrderId) {
          if (session.paymentStatus === "paid") return "paid"
          if (session.status === "expired") return "failed"
          return "pending"
        }
      }
      return "pending"
    }

    if (pi.status === "succeeded") return "paid"
    if (pi.status === "requires_payment_method") return "failed"
    return "pending"
  }

  async getSessionByPaymentIntent(paymentIntentId: string): Promise<{
    sessionId: string
    orderId?: string
    metadata: Record<string, string>
  } | null> {
    // Always get fresh state to ensure test-set sessions are visible
    const currentState = getMockPaymentState()
    for (const session of currentState.sessions.values()) {
      if (session.paymentIntent === paymentIntentId) {
        return {
          sessionId: session.id,
          orderId: session.metadata?.orderId,
          metadata: session.metadata || {},
        }
      }
    }
    return null
  }

  // Stripe Connect methods
  async createExpressAccount(params: CreateConnectAccountParams): Promise<ConnectAccount> {
    const accountId = `acct_test_${Date.now()}`

    const account: MockAccount = {
      id: accountId,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      country: params.country || "FR",
      defaultCurrency: "eur",
    }

    this.state.accounts.set(accountId, account)

    return {
      accountId,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
      country: account.country,
      defaultCurrency: account.defaultCurrency,
    }
  }

  async createAccountLink(
    accountId: string,
    _returnUrl: string,
    _refreshUrl: string
  ): Promise<AccountLink> {
    return {
      url: `https://connect.stripe.com/setup/e/${accountId}/test`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    }
  }

  async createLoginLink(accountId: string): Promise<{ url: string }> {
    return {
      url: `https://dashboard.stripe.com/${accountId}/test`,
    }
  }

  async getAccount(accountId: string): Promise<ConnectAccount> {
    const account = this.state.accounts.get(accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    return {
      accountId: account.id,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
      country: account.country,
      defaultCurrency: account.defaultCurrency,
    }
  }
}

/**
 * Simulate account becoming fully enabled (for testing)
 */
export function simulateMockAccountEnabled(accountId: string): void {
  const state = getMockPaymentState()
  const account = state.accounts.get(accountId)
  if (!account) {
    throw new Error(`Mock account not found: ${accountId}`)
  }

  account.chargesEnabled = true
  account.payoutsEnabled = true
  account.detailsSubmitted = true
}
