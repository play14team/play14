/**
 * Stripe mock responses factory
 *
 * These factories create mock Stripe API responses for testing payment flows
 */

export interface MockCheckoutSession {
  id: string
  object: "checkout.session"
  url: string
  expires_at: number
  payment_status: "paid" | "unpaid" | "no_payment_required"
  status: "open" | "complete" | "expired"
  customer_email: string | null
  metadata: Record<string, string>
  payment_intent: string | null
  amount_total: number
  currency: string
}

export interface MockPaymentIntent {
  id: string
  object: "payment_intent"
  amount: number
  currency: string
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "canceled"
    | "succeeded"
  metadata: Record<string, string>
}

export interface MockAccount {
  id: string
  object: "account"
  type: "express" | "standard" | "custom"
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  country: string
  default_currency: string
  metadata: Record<string, string>
}

export interface MockAccountLink {
  object: "account_link"
  url: string
  expires_at: number
}

export interface MockRefund {
  id: string
  object: "refund"
  amount: number
  status: "pending" | "succeeded" | "failed" | "canceled"
  payment_intent: string
}

export interface MockWebhookEvent {
  id: string
  object: "event"
  type: string
  data: {
    object: Record<string, unknown>
  }
}

let sessionCounter = 0
let accountCounter = 0

/**
 * Create a mock Stripe checkout session
 */
export function createMockCheckoutSession(
  overrides: Partial<MockCheckoutSession> = {}
): MockCheckoutSession {
  sessionCounter++
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60 // 30 minutes from now

  return {
    id: `cs_test_${sessionCounter}`,
    object: "checkout.session",
    url: `https://checkout.stripe.com/c/pay/cs_test_${sessionCounter}`,
    expires_at: expiresAt,
    payment_status: "unpaid",
    status: "open",
    customer_email: "customer@example.com",
    metadata: {},
    payment_intent: `pi_test_${sessionCounter}`,
    amount_total: 10000, // $100.00
    currency: "eur",
    ...overrides,
  }
}

/**
 * Create a completed checkout session
 */
export function createCompletedCheckoutSession(
  overrides: Partial<MockCheckoutSession> = {}
): MockCheckoutSession {
  return createMockCheckoutSession({
    payment_status: "paid",
    status: "complete",
    ...overrides,
  })
}

/**
 * Create an expired checkout session
 */
export function createExpiredCheckoutSession(
  overrides: Partial<MockCheckoutSession> = {}
): MockCheckoutSession {
  return createMockCheckoutSession({
    payment_status: "unpaid",
    status: "expired",
    expires_at: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
    ...overrides,
  })
}

/**
 * Create a mock payment intent
 */
export function createMockPaymentIntent(
  overrides: Partial<MockPaymentIntent> = {}
): MockPaymentIntent {
  return {
    id: `pi_test_${Date.now()}`,
    object: "payment_intent",
    amount: 10000,
    currency: "eur",
    status: "succeeded",
    metadata: {},
    ...overrides,
  }
}

/**
 * Create a mock Stripe Express account
 */
export function createMockAccount(
  overrides: Partial<MockAccount> = {}
): MockAccount {
  accountCounter++

  return {
    id: `acct_test_${accountCounter}`,
    object: "account",
    type: "express",
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    country: "FR",
    default_currency: "eur",
    metadata: {
      platform: "play14",
    },
    ...overrides,
  }
}

/**
 * Create an incomplete (onboarding not finished) account
 */
export function createIncompleteAccount(
  overrides: Partial<MockAccount> = {}
): MockAccount {
  return createMockAccount({
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false,
    ...overrides,
  })
}

/**
 * Create a mock account link
 */
export function createMockAccountLink(
  overrides: Partial<MockAccountLink> = {}
): MockAccountLink {
  return {
    object: "account_link",
    url: "https://connect.stripe.com/setup/e/acct_test/abc123",
    expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
    ...overrides,
  }
}

/**
 * Create a mock refund
 */
export function createMockRefund(overrides: Partial<MockRefund> = {}): MockRefund {
  return {
    id: `re_test_${Date.now()}`,
    object: "refund",
    amount: 10000,
    status: "succeeded",
    payment_intent: `pi_test_${Date.now()}`,
    ...overrides,
  }
}

/**
 * Create a mock webhook event
 */
export function createMockWebhookEvent(
  type: string,
  data: Record<string, unknown>,
  overrides: Partial<MockWebhookEvent> = {}
): MockWebhookEvent {
  return {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type,
    data: {
      object: data,
    },
    ...overrides,
  }
}

/**
 * Create a checkout.session.completed webhook event
 */
export function createCheckoutCompletedEvent(
  sessionOverrides: Partial<MockCheckoutSession> = {}
): MockWebhookEvent {
  const session = createCompletedCheckoutSession(sessionOverrides)
  return createMockWebhookEvent("checkout.session.completed", session as unknown as Record<string, unknown>)
}

/**
 * Create a checkout.session.expired webhook event
 */
export function createCheckoutExpiredEvent(
  sessionOverrides: Partial<MockCheckoutSession> = {}
): MockWebhookEvent {
  const session = createExpiredCheckoutSession(sessionOverrides)
  return createMockWebhookEvent("checkout.session.expired", session as unknown as Record<string, unknown>)
}

/**
 * Reset counters (useful in beforeEach)
 */
export function resetStripeCounters(): void {
  sessionCounter = 0
  accountCounter = 0
}
