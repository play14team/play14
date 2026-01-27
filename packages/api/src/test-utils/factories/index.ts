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

// Event factories
export {
  createAnnouncedEvent,
  createCancelledEvent,
  createEvent,
  createOngoingEvent,
  createPastEvent,
  type EventFixture,
  resetEventCounter,
} from "./event"

// Order factories
export {
  createCancelledOrder,
  createOrder,
  createOrderWithReservation,
  createPaidOrder,
  type OrderFixture,
  resetOrderCounter,
  type TicketDetail,
} from "./order"
// Player factories
export {
  createMinimalPlayer,
  createPlayer,
  createPrivatePlayer,
  type PlayerFixture,
  resetPlayerCounter,
} from "./player"
// Stripe mock factories
export {
  createCheckoutCompletedEvent,
  createCheckoutExpiredEvent,
  createCompletedCheckoutSession,
  createExpiredCheckoutSession,
  createIncompleteAccount,
  createMockAccount,
  createMockAccountLink,
  createMockCheckoutSession,
  createMockPaymentIntent,
  createMockRefund,
  createMockWebhookEvent,
  type MockAccount,
  type MockAccountLink,
  type MockCheckoutSession,
  type MockPaymentIntent,
  type MockRefund,
  type MockWebhookEvent,
  resetStripeCounters,
} from "./stripe"
// Ticket Type factories
export {
  createInactiveTicketType,
  createSoldOutTicketType,
  createTicketType,
  createUnlimitedTicketType,
  resetTicketTypeCounter,
  type TicketTypeFixture,
} from "./ticket-type"

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
