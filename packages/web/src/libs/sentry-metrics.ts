/**
 * Sentry Metrics Utilities
 *
 * Business metrics that are sent to Sentry for monitoring checkout flows,
 * user actions, and application health. These are separate from Prometheus
 * infrastructure metrics.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/metrics/
 */

import * as Sentry from "@sentry/nextjs"

// ============================================================================
// CHECKOUT METRICS
// ============================================================================

/**
 * Track when a user views tickets for an event
 */
export function trackTicketsViewed(eventId: string, ticketTypeCount: number): void {
  Sentry.metrics.count("checkout.tickets_viewed", 1, {
    attributes: {
      event_id: eventId,
      ticket_type_count: String(ticketTypeCount),
    },
  })
}

/**
 * Track when a user starts the checkout flow (selects tickets)
 */
export function trackCheckoutStarted(
  eventId: string,
  ticketCount: number,
  totalAmount: number,
  currency: string,
  hasDiscount: boolean
): void {
  Sentry.metrics.count("checkout.started", 1, {
    attributes: {
      event_id: eventId,
      has_discount: String(hasDiscount),
      currency,
    },
  })

  Sentry.metrics.distribution("checkout.ticket_count", ticketCount, {
    attributes: { event_id: eventId },
  })

  Sentry.metrics.distribution("checkout.initial_amount", totalAmount, {
    unit: currency.toLowerCase(),
    attributes: { event_id: eventId, has_discount: String(hasDiscount) },
  })
}

/**
 * Track when a draft order is created (user proceeds to attendee form)
 */
export function trackDraftOrderCreated(
  eventId: string,
  _orderId: string,
  _ticketCount: number,
  totalAmount: number,
  discountAmount: number,
  currency: string
): void {
  Sentry.metrics.count("checkout.draft_created", 1, {
    attributes: {
      event_id: eventId,
      currency,
      is_free: String(totalAmount === 0),
    },
  })

  if (discountAmount > 0) {
    Sentry.metrics.distribution("checkout.discount_amount", discountAmount, {
      unit: currency.toLowerCase(),
      attributes: { event_id: eventId },
    })
  }
}

/**
 * Track when attendee information is submitted
 */
export function trackAttendeeInfoSubmitted(eventId: string, _orderId: string): void {
  Sentry.metrics.count("checkout.attendee_info_submitted", 1, {
    attributes: { event_id: eventId },
  })
}

/**
 * Track when checkout is finalized and user is redirected to payment
 */
export function trackCheckoutFinalized(
  eventId: string,
  _orderId: string,
  isFreeOrder: boolean
): void {
  Sentry.metrics.count("checkout.finalized", 1, {
    attributes: {
      event_id: eventId,
      is_free: String(isFreeOrder),
    },
  })
}

/**
 * Track checkout errors
 */
export function trackCheckoutError(
  eventId: string,
  step: "draft_creation" | "attendee_info" | "finalize" | "payment",
  errorMessage?: string
): void {
  Sentry.metrics.count("checkout.error", 1, {
    attributes: {
      event_id: eventId,
      step,
      error_type: errorMessage ? "api_error" : "unknown",
    },
  })
}

/**
 * Track when user abandons checkout (goes back to selection)
 */
export function trackCheckoutAbandoned(eventId: string, step: "attendees" | "payment"): void {
  Sentry.metrics.count("checkout.abandoned", 1, {
    attributes: {
      event_id: eventId,
      step,
    },
  })
}

// ============================================================================
// DISCOUNT CODE METRICS
// ============================================================================

/**
 * Track discount code validation attempts
 */
export function trackDiscountCodeValidation(
  eventId: string,
  isValid: boolean,
  discountType?: "percentage" | "fixed"
): void {
  Sentry.metrics.count("discount_code.validated", 1, {
    attributes: {
      event_id: eventId,
      is_valid: String(isValid),
      discount_type: discountType || "none",
    },
  })
}

// ============================================================================
// AUTH FLOW METRICS
// ============================================================================

/**
 * Track when auth is required during checkout
 */
export function trackAuthRequired(eventId: string, source: "checkout" | "ticket_view"): void {
  Sentry.metrics.count("auth.required", 1, {
    attributes: {
      event_id: eventId,
      source,
    },
  })
}

// ============================================================================
// TIMING HELPERS
// ============================================================================

/**
 * Measure and track the duration of an async operation
 */
export async function withTiming<T>(
  metricName: string,
  fn: () => Promise<T>,
  attributes: Record<string, string> = {}
): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    const duration = performance.now() - start
    Sentry.metrics.distribution(metricName, duration, {
      unit: "millisecond",
      attributes,
    })
  }
}

/**
 * Track server action duration
 */
export function trackServerActionDuration(
  actionName: string,
  durationMs: number,
  success: boolean
): void {
  Sentry.metrics.distribution("server_action.duration", durationMs, {
    unit: "millisecond",
    attributes: {
      action: actionName,
      success: String(success),
    },
  })
}

// ============================================================================
// TRACING SPANS
// ============================================================================

/**
 * Create a span for checkout operations with automatic timing
 * Use this to wrap async operations in the checkout flow for detailed tracing
 *
 * @example
 * const result = await withCheckoutSpan("create-draft-order", eventId, async () => {
 *   return createDraftOrder(eventId, tickets, discountCode)
 * })
 */
export async function withCheckoutSpan<T>(
  operation: string,
  eventId: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `checkout.${operation}`,
      op: "checkout",
      attributes: {
        "checkout.event_id": eventId,
        "checkout.operation": operation,
      },
    },
    async () => {
      return fn()
    }
  )
}

/**
 * Create a span for API calls with automatic timing
 */
export async function withApiSpan<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `api.${method.toLowerCase()}.${endpoint}`,
      op: "http.client",
      attributes: {
        "http.method": method,
        "http.url": endpoint,
      },
    },
    async () => {
      return fn()
    }
  )
}

/**
 * Create a span for form validation
 */
export async function withValidationSpan<T>(formName: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      name: `validation.${formName}`,
      op: "validation",
      attributes: {
        "validation.form": formName,
      },
    },
    async () => {
      return fn()
    }
  )
}
