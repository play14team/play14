/**
 * Payment provider factory
 *
 * In test environment (NODE_ENV=test), returns a mock provider
 * that doesn't make real API calls.
 */

import type { PaymentProvider, PaymentProviderType, ConnectPaymentProvider } from "./types"
import { StripeProvider } from "./providers/stripe"
import { MockPaymentProvider } from "./providers/mock"

let stripeProvider: StripeProvider | null = null
let mockProvider: MockPaymentProvider | null = null

/**
 * Check if we're in test environment
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test"
}

export function getPaymentProvider(providerType: PaymentProviderType): PaymentProvider {
  // In test environment, always return the mock provider for stripe
  if (isTestEnvironment() && providerType === "stripe") {
    if (!mockProvider) {
      mockProvider = new MockPaymentProvider()
    }
    return mockProvider
  }

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

/**
 * Get payment provider with Connect support
 * Returns the provider cast to ConnectPaymentProvider
 */
export function getConnectPaymentProvider(providerType: PaymentProviderType): ConnectPaymentProvider {
  const provider = getPaymentProvider(providerType)
  return provider as ConnectPaymentProvider
}

/**
 * Reset provider instances (useful for tests)
 */
export function resetPaymentProviders(): void {
  stripeProvider = null
  mockProvider = null
}
