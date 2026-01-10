/**
 * Test data factories for API unit tests
 *
 * Re-exports all factory functions for convenient imports:
 *
 * @example
 * ```ts
 * import { createEvent, createPlayer, createOrder } from "@/test-utils/factories"
 * ```
 */

// Ticket Type factories
export {
  createTicketType,
  createUnlimitedTicketType,
  createSoldOutTicketType,
  createInactiveTicketType,
  resetTicketTypeCounter,
  type TicketTypeFixture,
} from "./ticket-type"

// Order factories
export {
  createOrder,
  createOrderWithReservation,
  createPaidOrder,
  createCancelledOrder,
  resetOrderCounter,
  type OrderFixture,
  type TicketDetail,
} from "./order"

// Event factories
export {
  createEvent,
  createPastEvent,
  createOngoingEvent,
  createCancelledEvent,
  createAnnouncedEvent,
  resetEventCounter,
  type EventFixture,
} from "./event"

// Player factories
export {
  createPlayer,
  createPrivatePlayer,
  createMinimalPlayer,
  resetPlayerCounter,
  type PlayerFixture,
} from "./player"

// Stripe mock factories
export {
  createMockCheckoutSession,
  createCompletedCheckoutSession,
  createExpiredCheckoutSession,
  createMockPaymentIntent,
  createMockAccount,
  createIncompleteAccount,
  createMockAccountLink,
  createMockRefund,
  createMockWebhookEvent,
  createCheckoutCompletedEvent,
  createCheckoutExpiredEvent,
  resetStripeCounters,
  type MockCheckoutSession,
  type MockPaymentIntent,
  type MockAccount,
  type MockAccountLink,
  type MockRefund,
  type MockWebhookEvent,
} from "./stripe"

/**
 * Reset all factory counters
 * Useful in beforeEach to ensure consistent test data
 */
export function resetAllCounters(): void {
  const { resetTicketTypeCounter } = require("./ticket-type")
  const { resetOrderCounter } = require("./order")
  const { resetEventCounter } = require("./event")
  const { resetPlayerCounter } = require("./player")
  const { resetStripeCounters } = require("./stripe")

  resetTicketTypeCounter()
  resetOrderCounter()
  resetEventCounter()
  resetPlayerCounter()
  resetStripeCounters()
}
