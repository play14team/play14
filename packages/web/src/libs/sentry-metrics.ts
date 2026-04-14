/**
 * Business Metrics Utilities
 *
 * These functions are called from client components (ticket-purchase-flow,
 * ticket-selector) where prom-client cannot be imported. Since the API
 * package already tracks all critical business events server-side via its
 * own Prometheus registry (orders, webhooks, payments, etc.), these
 * client-side tracking functions are intentional no-ops.
 *
 * The function signatures are preserved to avoid changing callers.
 */

// ============================================================================
// CHECKOUT METRICS (no-ops — tracked server-side by the API)
// ============================================================================

export function trackTicketsViewed(_eventId: string, _ticketTypeCount: number): void {}

export function trackCheckoutStarted(
  _eventId: string,
  _ticketCount: number,
  _totalAmount: number,
  _currency: string,
  _hasDiscount: boolean
): void {}

export function trackDraftOrderCreated(
  _eventId: string,
  _orderId: string,
  _ticketCount: number,
  _totalAmount: number,
  _discountAmount: number,
  _currency: string
): void {}

export function trackAttendeeInfoSubmitted(_eventId: string, _orderId: string): void {}

export function trackCheckoutFinalized(
  _eventId: string,
  _orderId: string,
  _isFreeOrder: boolean
): void {}

export function trackCheckoutError(
  _eventId: string,
  _step: "draft_creation" | "attendee_info" | "finalize" | "payment",
  _errorMessage?: string
): void {}

export function trackCheckoutAbandoned(_eventId: string, _step: "attendees" | "payment"): void {}

// ============================================================================
// DISCOUNT CODE METRICS
// ============================================================================

export function trackDiscountCodeValidation(
  _eventId: string,
  _isValid: boolean,
  _discountType?: "percentage" | "fixed"
): void {}

// ============================================================================
// AUTH FLOW METRICS
// ============================================================================

export function trackAuthRequired(_eventId: string, _source: "checkout" | "ticket_view"): void {}

// ============================================================================
// TIMING HELPERS
// ============================================================================

export async function withTiming<T>(
  _metricName: string,
  fn: () => Promise<T>,
  _attributes: Record<string, string> = {}
): Promise<T> {
  return fn()
}

export function trackServerActionDuration(
  _actionName: string,
  _durationMs: number,
  _success: boolean
): void {}

// ============================================================================
// PASS-THROUGH SPAN WRAPPERS (tracing removed with Sentry)
// ============================================================================

export async function withCheckoutSpan<T>(
  _operation: string,
  _eventId: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn()
}

export async function withApiSpan<T>(
  _endpoint: string,
  _method: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn()
}

export async function withValidationSpan<T>(_formName: string, fn: () => Promise<T>): Promise<T> {
  return fn()
}
