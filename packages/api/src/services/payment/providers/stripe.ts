/**
 * Stripe payment provider implementation with Connect support
 *
 * This provider handles all Stripe API interactions with comprehensive
 * logging and metrics for observability.
 */

import Stripe from "stripe"
import { type LogContext, createLogger, startTimer } from "../../observability/logger"
import { stripeApiCallsTotal, stripeApiDuration } from "../../observability/metrics"
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

const log = createLogger("[Stripe]")

/**
 * ISO 4217 currency codes supported by this platform.
 *
 * NOTE: Stripe supports 135+ currencies, but we intentionally limit to currencies
 * commonly used by #play14 events to:
 * 1. Ensure proper testing coverage for payment flows
 * 2. Maintain consistent decimal handling (some currencies like JPY are zero-decimal)
 * 3. Reduce risk of currency-related payment errors
 *
 * To add a new currency:
 * 1. Add it to this set
 * 2. Verify it works with Stripe Connect in your target countries
 * 3. Test the full payment flow including refunds
 * 4. Update documentation if needed
 *
 * For Stripe's full currency list, see: https://stripe.com/docs/currencies
 */
const SUPPORTED_CURRENCIES = new Set([
  // Major currencies
  "usd", // US Dollar
  "eur", // Euro
  "gbp", // British Pound
  "cad", // Canadian Dollar
  "aud", // Australian Dollar
  "jpy", // Japanese Yen (zero-decimal)
  "chf", // Swiss Franc
  "nzd", // New Zealand Dollar
  // European currencies
  "sek", // Swedish Krona
  "nok", // Norwegian Krone
  "dkk", // Danish Krone
  "pln", // Polish Zloty
  "czk", // Czech Koruna
  "huf", // Hungarian Forint
  "ron", // Romanian Leu
  "bgn", // Bulgarian Lev
  "hrk", // Croatian Kuna (legacy, now EUR)
  "isk", // Icelandic Króna
  // Asia-Pacific
  "inr", // Indian Rupee
  "sgd", // Singapore Dollar
  "hkd", // Hong Kong Dollar
  "thb", // Thai Baht
  "myr", // Malaysian Ringgit
  "php", // Philippine Peso
  "idr", // Indonesian Rupiah
  "krw", // South Korean Won (zero-decimal)
  "twd", // Taiwan Dollar
  // Americas
  "mxn", // Mexican Peso
  "brl", // Brazilian Real
  "ars", // Argentine Peso
  "clp", // Chilean Peso (zero-decimal)
  "cop", // Colombian Peso
  // Middle East & Africa
  "ils", // Israeli New Shekel
  "zar", // South African Rand
  "aed", // UAE Dirham
  "sar", // Saudi Riyal
])

/**
 * Validate and normalize currency code
 * @throws Error if currency is invalid
 */
function validateCurrency(currency: string | undefined): string {
  if (!currency || typeof currency !== "string") {
    throw new Error("Currency is required")
  }

  const normalized = currency.toLowerCase().trim()

  if (normalized.length !== 3) {
    throw new Error(`Invalid currency code: ${currency}. Must be a 3-letter ISO 4217 code.`)
  }

  if (!SUPPORTED_CURRENCIES.has(normalized)) {
    throw new Error(
      `Unsupported currency: ${currency}. Supported currencies: ${Array.from(SUPPORTED_CURRENCIES).join(", ")}`
    )
  }

  return normalized
}

/**
 * Record metrics for a Stripe API call
 */
function recordMetrics(operation: string, status: "success" | "error", durationMs: number): void {
  stripeApiCallsTotal.inc({ operation, status })
  stripeApiDuration.observe({ operation }, durationMs / 1000)
}

export class StripeProvider implements ConnectPaymentProvider {
  private stripe: Stripe
  private webhookSecret: string
  private webhookSecretConnect: string

  constructor(webhookSecret?: string, webhookSecretConnect?: string) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }

    this.stripe = new Stripe(secretKey)

    // Allow passing secrets as parameters for testing, otherwise use env vars
    // Use ?? for nullish coalescing so empty strings are preserved (for testing)
    this.webhookSecret = webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? ""
    this.webhookSecretConnect =
      webhookSecretConnect ?? process.env.STRIPE_WEBHOOK_SECRET_CONNECT ?? ""
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const operation = "createCheckoutSession"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      orderId: params.orderId,
      currency: params.currency,
      lineItemCount: params.lineItems.length,
      totalAmount: params.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    }

    log.info("Creating checkout session", context)

    const currency = validateCurrency(params.currency)

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: params.lineItems.map((item) => ({
          price_data: {
            currency,
            product_data: {
              name: item.name,
              description: item.description,
            },
            unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
          },
          quantity: item.quantity,
        })),
        mode: "payment",
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          orderId: params.orderId,
          ...params.metadata,
        },
      })

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.info("Checkout session created successfully", {
        ...context,
        sessionId: session.id,
        durationMs,
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
      })

      return {
        sessionId: session.id,
        sessionUrl: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to create checkout session",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
          stripeErrorType: error.type,
        },
        error
      )

      throw error
    }
  }

  /**
   * Create checkout session with Stripe Connect destination charges
   * Funds go directly to the connected account, with optional platform fee
   */
  async createCheckoutSessionWithConnect(
    params: CreateCheckoutWithConnectParams
  ): Promise<CheckoutSession> {
    const operation = "createCheckoutSessionWithConnect"
    const timer = startTimer()
    const totalAmount = params.lineItems.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    )
    const context: LogContext = {
      operation,
      orderId: params.orderId,
      currency: params.currency,
      lineItemCount: params.lineItems.length,
      totalAmount: totalAmount / 100,
      connectedAccountId: params.connectedAccountId,
      applicationFeeAmount: params.applicationFeeAmount,
    }

    log.info("Creating Connect checkout session", context)

    const currency = validateCurrency(params.currency)

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: params.lineItems.map((item) => ({
          price_data: {
            currency,
            product_data: {
              name: item.name,
              description: item.description,
            },
            unit_amount: Math.round(item.unitPrice * 100),
          },
          quantity: item.quantity,
        })),
        mode: "payment",
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          orderId: params.orderId,
          ...params.metadata,
        },
        payment_intent_data: {
          application_fee_amount: params.applicationFeeAmount || 0,
          transfer_data: {
            destination: params.connectedAccountId,
          },
          metadata: {
            orderId: params.orderId,
            ...params.metadata,
          },
        },
      })

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.info("Connect checkout session created successfully", {
        ...context,
        sessionId: session.id,
        durationMs,
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
      })

      return {
        sessionId: session.id,
        sessionUrl: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to create Connect checkout session",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
          stripeErrorType: error.type,
        },
        error
      )

      throw error
    }
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    const operation = "processRefund"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      paymentIntentId: params.providerOrderId,
      refundAmount: params.amount,
    }

    log.info("Processing refund", context)

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.providerOrderId,
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
        reason: "requested_by_customer",
      })

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.info("Refund processed successfully", {
        ...context,
        refundId: refund.id,
        refundedAmount: refund.amount / 100,
        refundStatus: refund.status,
        durationMs,
      })

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to process refund",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
          stripeErrorType: error.type,
        },
        error
      )

      throw error
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<WebhookEvent> {
    const operation = "verifyWebhookSignature"
    const timer = startTimer()

    if (
      (!this.webhookSecret || this.webhookSecret.trim().length === 0) &&
      (!this.webhookSecretConnect || this.webhookSecretConnect.trim().length === 0)
    ) {
      log.error("No webhook secrets configured", { operation })
      throw new Error(
        "At least one of STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_CONNECT must be set"
      )
    }

    let event: Stripe.Event | null = null
    const errors: string[] = []
    let verifiedWith: "platform" | "connect" | null = null

    // Try platform webhook secret first
    if (this.webhookSecret && this.webhookSecret.trim().length > 0) {
      try {
        event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)
        verifiedWith = "platform"
      } catch (error: any) {
        errors.push(`Platform webhook: ${error.message}`)
      }
    }

    // If platform secret failed or not set, try connect webhook secret
    if (!event && this.webhookSecretConnect && this.webhookSecretConnect.trim().length > 0) {
      try {
        event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecretConnect)
        verifiedWith = "connect"
      } catch (error: any) {
        errors.push(`Connect webhook: ${error.message}`)
      }
    }

    const durationMs = timer.elapsed()

    // If both failed, throw error with details
    if (!event) {
      recordMetrics(operation, "error", durationMs)
      log.error("Webhook signature verification failed", {
        operation,
        durationMs,
        errors: errors.join("; "),
      })
      throw new Error(`Webhook signature verification failed. ${errors.join("; ")}`)
    }

    recordMetrics(operation, "success", durationMs)
    log.info("Webhook signature verified", {
      operation,
      stripeEventId: event.id,
      eventType: event.type,
      verifiedWith,
      durationMs,
    })

    return {
      id: event.id,
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<"paid" | "pending" | "failed"> {
    const operation = "getOrderStatus"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      paymentIntentId: providerOrderId,
    }

    log.debug("Retrieving payment intent status", context)

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(providerOrderId)

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      let status: "paid" | "pending" | "failed"
      switch (paymentIntent.status) {
        case "succeeded":
          status = "paid"
          break
        case "processing":
        case "requires_payment_method":
        case "requires_confirmation":
        case "requires_action":
          status = "pending"
          break
        default:
          status = "failed"
      }

      log.debug("Payment intent status retrieved", {
        ...context,
        stripeStatus: paymentIntent.status,
        mappedStatus: status,
        durationMs,
      })

      return status
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to retrieve payment intent status",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
        },
        error
      )

      throw error
    }
  }

  async getSessionByPaymentIntent(paymentIntentId: string): Promise<{
    sessionId: string
    orderId?: string
    metadata: Record<string, string>
  } | null> {
    const operation = "getSessionByPaymentIntent"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      paymentIntentId,
    }

    log.debug("Looking up session by payment intent", context)

    try {
      // Search for checkout sessions with this payment intent
      const sessions = await this.stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      })

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      if (sessions.data.length === 0) {
        log.debug("No session found for payment intent", {
          ...context,
          durationMs,
        })
        return null
      }

      const session = sessions.data[0]
      log.debug("Session found for payment intent", {
        ...context,
        sessionId: session.id,
        orderId: session.metadata?.orderId,
        durationMs,
      })

      return {
        sessionId: session.id,
        orderId: session.metadata?.orderId,
        metadata: (session.metadata as Record<string, string>) || {},
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to lookup session by payment intent",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
        },
        error
      )

      throw error
    }
  }

  // ============================================
  // Stripe Connect Methods
  // ============================================

  /**
   * Create a Stripe Express connected account
   */
  async createExpressAccount(params: CreateConnectAccountParams): Promise<ConnectAccount> {
    const operation = "createExpressAccount"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      email: params.email,
      country: params.country || "FR",
      businessType: params.businessType || "individual",
    }

    log.info("Creating Express connected account", context)

    try {
      const account = await this.stripe.accounts.create({
        type: "express",
        country: params.country || "FR",
        email: params.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: params.businessType || "individual",
        metadata: {
          platform: "play14",
          ...params.metadata,
        },
      })

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.info("Express connected account created", {
        ...context,
        stripeAccountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        durationMs,
      })

      return {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        country: account.country || undefined,
        defaultCurrency: account.default_currency || undefined,
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to create Express connected account",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
          stripeErrorType: error.type,
        },
        error
      )

      throw error
    }
  }

  /**
   * Create an account link for onboarding
   */
  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<AccountLink> {
    const operation = "createAccountLink"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      stripeAccountId: accountId,
    }

    log.info("Creating account link for onboarding", context)

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      })

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.info("Account link created", {
        ...context,
        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
        durationMs,
      })

      return {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000),
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to create account link",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
        },
        error
      )

      throw error
    }
  }

  /**
   * Create a login link for the Express dashboard
   */
  async createLoginLink(accountId: string): Promise<{ url: string }> {
    const operation = "createLoginLink"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      stripeAccountId: accountId,
    }

    log.debug("Creating login link for Express dashboard", context)

    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId)

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.debug("Login link created", {
        ...context,
        durationMs,
      })

      return {
        url: loginLink.url,
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to create login link",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
        },
        error
      )

      throw error
    }
  }

  /**
   * Get account details from Stripe
   */
  async getAccount(accountId: string): Promise<ConnectAccount> {
    const operation = "getAccount"
    const timer = startTimer()
    const context: LogContext = {
      operation,
      stripeAccountId: accountId,
    }

    log.debug("Retrieving account details", context)

    try {
      const account = await this.stripe.accounts.retrieve(accountId)

      const durationMs = timer.elapsed()
      recordMetrics(operation, "success", durationMs)

      log.debug("Account details retrieved", {
        ...context,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        durationMs,
      })

      return {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        country: account.country || undefined,
        defaultCurrency: account.default_currency || undefined,
      }
    } catch (error: any) {
      const durationMs = timer.elapsed()
      recordMetrics(operation, "error", durationMs)

      log.error(
        "Failed to retrieve account details",
        {
          ...context,
          durationMs,
          stripeErrorCode: error.code,
        },
        error
      )

      throw error
    }
  }
}
