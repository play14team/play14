/**
 * Stripe payment provider implementation with Connect support
 */

import Stripe from "stripe"
import type {
  ConnectPaymentProvider,
  CreateCheckoutSessionParams,
  CreateCheckoutWithConnectParams,
  CreateConnectAccountParams,
  CheckoutSession,
  RefundParams,
  RefundResult,
  WebhookEvent,
  ConnectAccount,
  AccountLink,
} from "../types"

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

export class StripeProvider implements ConnectPaymentProvider {
  private stripe: Stripe
  private webhookSecret: string

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }

    this.stripe = new Stripe(secretKey)

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const currency = validateCurrency(params.currency)

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

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
      expiresAt: new Date(session.expires_at * 1000),
    }
  }

  /**
   * Create checkout session with Stripe Connect destination charges
   * Funds go directly to the connected account, with optional platform fee
   */
  async createCheckoutSessionWithConnect(
    params: CreateCheckoutWithConnectParams
  ): Promise<CheckoutSession> {
    const currency = validateCurrency(params.currency)

    const totalAmount = params.lineItems.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    )

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

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
      expiresAt: new Date(session.expires_at * 1000),
    }
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: params.providerOrderId,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      reason: "requested_by_customer",
    })

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<WebhookEvent> {
    if (!this.webhookSecret || this.webhookSecret.trim().length === 0) {
      throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set or empty")
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)

    return {
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<"paid" | "pending" | "failed"> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(providerOrderId)

    switch (paymentIntent.status) {
      case "succeeded":
        return "paid"
      case "processing":
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return "pending"
      default:
        return "failed"
    }
  }

  // ============================================
  // Stripe Connect Methods
  // ============================================

  /**
   * Create a Stripe Express connected account
   */
  async createExpressAccount(params: CreateConnectAccountParams): Promise<ConnectAccount> {
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

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      country: account.country || undefined,
      defaultCurrency: account.default_currency || undefined,
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
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    })

    return {
      url: accountLink.url,
      expiresAt: new Date(accountLink.expires_at * 1000),
    }
  }

  /**
   * Create a login link for the Express dashboard
   */
  async createLoginLink(accountId: string): Promise<{ url: string }> {
    const loginLink = await this.stripe.accounts.createLoginLink(accountId)

    return {
      url: loginLink.url,
    }
  }

  /**
   * Get account details from Stripe
   */
  async getAccount(accountId: string): Promise<ConnectAccount> {
    const account = await this.stripe.accounts.retrieve(accountId)

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      country: account.country || undefined,
      defaultCurrency: account.default_currency || undefined,
    }
  }
}
