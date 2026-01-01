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
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: params.lineItems.map((item) => ({
        price_data: {
          currency: params.currency.toLowerCase(),
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
    const totalAmount = params.lineItems.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    )

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card", "sepa_debit", "bancontact", "ideal", "giropay", "eps", "p24"],
      line_items: params.lineItems.map((item) => ({
        price_data: {
          currency: params.currency.toLowerCase(),
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
    if (!this.webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set")
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
