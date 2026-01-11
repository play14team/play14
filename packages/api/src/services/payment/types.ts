/**
 * Payment provider types and interfaces
 */

export interface CreateCheckoutSessionParams {
  orderId: string
  lineItems: Array<{
    name: string
    description?: string
    unitPrice: number
    quantity: number
  }>
  currency: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

/**
 * Extended checkout params for Stripe Connect destination charges
 */
export interface CreateCheckoutWithConnectParams extends CreateCheckoutSessionParams {
  connectedAccountId: string
  applicationFeeAmount?: number // Platform fee in smallest currency unit (cents)
}

export interface CheckoutSession {
  sessionId: string
  sessionUrl: string
  expiresAt?: Date
}

export interface RefundParams {
  providerOrderId: string
  amount?: number // Full refund if not specified
  reason?: string
}

export interface RefundResult {
  refundId: string
  amount: number
  status: "succeeded" | "pending" | "failed"
}

export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, unknown>
}

/**
 * Stripe Connect account creation params
 */
export interface CreateConnectAccountParams {
  email: string
  country?: string
  businessType?: "individual" | "company"
  metadata?: Record<string, string>
}

/**
 * Stripe Connect account info
 */
export interface ConnectAccount {
  accountId: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  country?: string
  defaultCurrency?: string
}

/**
 * Stripe Connect account link for onboarding
 */
export interface AccountLink {
  url: string
  expiresAt: Date
}

/**
 * Session metadata retrieved from payment provider
 */
export interface SessionMetadata {
  sessionId: string
  orderId?: string
  metadata: Record<string, string>
}

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>
  processRefund(params: RefundParams): Promise<RefundResult>
  verifyWebhookSignature(payload: string, signature: string): Promise<WebhookEvent>
  getOrderStatus(providerOrderId: string): Promise<"paid" | "pending" | "failed">
  /**
   * Get session metadata by payment intent ID
   * Used by webhook handlers to find orders when payment fails
   */
  getSessionByPaymentIntent?(paymentIntentId: string): Promise<SessionMetadata | null>
}

/**
 * Extended payment provider with Stripe Connect support
 */
export interface ConnectPaymentProvider extends PaymentProvider {
  createExpressAccount(params: CreateConnectAccountParams): Promise<ConnectAccount>
  createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<AccountLink>
  createLoginLink(accountId: string): Promise<{ url: string }>
  getAccount(accountId: string): Promise<ConnectAccount>
  createCheckoutSessionWithConnect(params: CreateCheckoutWithConnectParams): Promise<CheckoutSession>
}

export type PaymentProviderType = "stripe" | "manual"
