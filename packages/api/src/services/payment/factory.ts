/**
 * Payment provider factory
 */

import type { PaymentProvider, PaymentProviderType } from "./types"
import { StripeProvider } from "./providers/stripe"

let stripeProvider: StripeProvider | null = null

export function getPaymentProvider(providerType: PaymentProviderType): PaymentProvider {
  switch (providerType) {
    case "stripe":
      if (!stripeProvider) {
        stripeProvider = new StripeProvider()
      }
      return stripeProvider

    case "manual":
      throw new Error("Manual payment does not support programmatic processing")

    default:
      throw new Error(`Unknown payment provider type: ${providerType}`)
  }
}
