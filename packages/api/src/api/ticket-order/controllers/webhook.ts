/**
 * Webhook controller for handling Stripe payment events
 *
 * This controller processes Stripe webhooks with comprehensive observability:
 * - Prometheus metrics for monitoring
 * - Structured logging with timing information
 * - Correlation IDs for request tracing
 */

import type { Core } from "@strapi/strapi"
import { TABLES } from "../../../libs/tables"
import { generateTicketCode } from "../../../libs/tickets"
import {
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail as sendPaymentFailedNotification,
  sendPlayerInvitationEmail as sendPlayerInvitationNotification,
  sendStripeAccountStatusEmail,
  sendTicketSoldNotificationEmail as sendTicketSoldNotification,
} from "../../../services/email-templates"
import { generateCorrelationId, startTimer } from "../../../services/observability/logger"
import {
  webhookProcessingDuration,
  webhookProcessingTotal,
} from "../../../services/observability/metrics"
import { getPaymentProvider } from "../../../services/payment"
import type { WebhookEvent } from "../../../services/payment/types"
import {
  addPlayerToEventAttendees,
  confirmDiscountCode,
  confirmReservations,
  findOrCreatePlayerForAttendee,
  releaseDiscountCode,
  releaseReservations,
} from "../../../services/ticketing"
import {
  claimWebhookEvent,
  markWebhookCompleted,
  markWebhookFailed,
  releaseWebhookClaim,
} from "../../../services/webhook"

interface AttendeeInfo {
  firstName: string
  lastName: string
  email: string
  tshirtSize?: string
  foodPreferences?: string
  photoConsent: boolean
  photoConsentTimestamp?: string
}

/**
 * Trigger on-demand revalidation of static pages in the Next.js frontend.
 * This is called after ticket purchases to update the participant list on event pages.
 * Failures are logged but don't affect the webhook processing (non-critical).
 */
const triggerFrontendRevalidation = async (
  type: "event" | "player",
  slug: string,
  strapi: Core.Strapi
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL
  const revalidateSecret = process.env.REVALIDATE_SECRET

  if (!frontendUrl || !revalidateSecret) {
    strapi.log.debug(
      "[Webhook] Skipping frontend revalidation - FRONTEND_URL or REVALIDATE_SECRET not configured"
    )
    return
  }

  try {
    const response = await fetch(`${frontendUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-token": revalidateSecret,
      },
      body: JSON.stringify({ type, slug }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      strapi.log.warn(
        `[Webhook] Frontend revalidation failed: ${response.status} - ${errorText} | type=${type}, slug=${slug}`
      )
    } else {
      strapi.log.info(`[Webhook] Frontend revalidation triggered | type=${type}, slug=${slug}`)
    }
  } catch (error: any) {
    // Non-critical failure - log and continue
    strapi.log.warn(
      `[Webhook] Frontend revalidation error: ${error.message} | type=${type}, slug=${slug}`
    )
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Handle Stripe webhook events with comprehensive observability
   */
  async handleStripeWebhook(ctx) {
    const correlationId = generateCorrelationId()
    const webhookTimer = startTimer()
    const signature = ctx.request.headers["stripe-signature"]

    if (!signature) {
      strapi.log.warn(`[Webhook] Missing Stripe signature header | correlationId=${correlationId}`)
      webhookProcessingTotal.inc({ event_type: "unknown", status: "rejected" })
      return ctx.badRequest("Missing signature")
    }

    // Get raw body for signature verification (requires includeUnparsed: true in body middleware)
    // SECURITY: We must use the raw unparsed body for signature verification.
    // Using JSON.stringify on parsed body would produce a different signature and could allow bypass.
    const unparsedBody = ctx.request.body[Symbol.for("unparsedBody")]

    if (!unparsedBody || typeof unparsedBody !== "string") {
      strapi.log.error(
        `[Webhook] Raw body not available for signature verification - check body middleware config (includeUnparsed: true) | correlationId=${correlationId}`
      )
      webhookProcessingTotal.inc({ event_type: "unknown", status: "rejected" })
      return ctx.badRequest("Webhook signature verification failed: raw body unavailable")
    }

    const payload = unparsedBody

    let event: WebhookEvent

    try {
      const provider = getPaymentProvider("stripe")
      event = await provider.verifyWebhookSignature(payload, signature)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      strapi.log.error(
        `[Webhook] Signature verification failed: ${errorMessage} | correlationId=${correlationId}`
      )
      webhookProcessingTotal.inc({ event_type: "unknown", status: "rejected" })
      return ctx.badRequest("Webhook verification failed")
    }

    const eventId = event.id
    const eventType = event.type

    strapi.log.info(
      `[Webhook] Received Stripe event: ${eventType} (${eventId}) | correlationId=${correlationId}`
    )

    // IDEMPOTENCY: Claim the event for processing
    // Uses atomic INSERT with unique constraint to prevent duplicate processing
    const idempotencyResult = await claimWebhookEvent(strapi, eventId, eventType)

    if (!idempotencyResult.shouldProcess) {
      strapi.log.info(
        `[Webhook] Event ${eventId} already processed (status: ${idempotencyResult.webhookStatus}) - returning success | correlationId=${correlationId}`
      )
      webhookProcessingTotal.inc({ event_type: eventType, status: "duplicate" })
      return ctx.send({ received: true, duplicate: true })
    }

    try {
      switch (eventType) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data, correlationId)
          break

        case "checkout.session.expired":
          await this.handleCheckoutExpired(event.data, correlationId)
          break

        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(event.data, correlationId)
          break

        case "charge.refunded":
          await this.handleChargeRefunded(event.data, correlationId)
          break

        case "account.updated":
          await this.handleAccountUpdated(event.data, correlationId)
          break

        default:
          strapi.log.info(
            `[Webhook] Unhandled event type: ${eventType} | correlationId=${correlationId}`
          )
      }

      // Mark event as successfully processed
      await markWebhookCompleted(strapi, eventId)

      const durationMs = webhookTimer.elapsed()
      webhookProcessingTotal.inc({ event_type: eventType, status: "success" })
      webhookProcessingDuration.observe({ event_type: eventType }, durationMs / 1000)
      strapi.log.info(
        `[Webhook] Event processed successfully: ${eventType} (${eventId}) | durationMs=${durationMs}, correlationId=${correlationId}`
      )

      return ctx.send({ received: true })
    } catch (error: any) {
      const durationMs = webhookTimer.elapsed()
      strapi.log.error(
        `[Webhook] Error processing event ${eventId}: ${error.message} | event_type=${eventType}, durationMs=${durationMs}, correlationId=${correlationId}, stack=${error.stack}`
      )

      // For retryable errors, release the claim so Stripe can retry
      // For non-retryable errors, mark as failed to prevent endless retries
      const isRetryable = this.isRetryableError(error)

      if (isRetryable) {
        await releaseWebhookClaim(strapi, eventId)
        webhookProcessingTotal.inc({ event_type: eventType, status: "retry" })
        webhookProcessingDuration.observe({ event_type: eventType }, durationMs / 1000)
        // Return 500 to signal Stripe should retry
        ctx.status = 500
        return ctx.send({ error: "Processing failed, will retry" })
      }
      await markWebhookFailed(strapi, eventId, error.message)
      webhookProcessingTotal.inc({ event_type: eventType, status: "failed" })
      webhookProcessingDuration.observe({ event_type: eventType }, durationMs / 1000)
      // Return 200 to prevent Stripe from retrying non-retryable errors
      return ctx.send({ received: true, error: error.message })
    }
  },

  /**
   * Handle successful checkout session with enhanced logging
   */
  async handleCheckoutCompleted(
    sessionData: Record<string, unknown>,
    correlationId: string = generateCorrelationId()
  ) {
    const handlerTimer = startTimer()
    const sessionId = sessionData.id as string
    const paymentIntent = sessionData.payment_intent as string
    const _metadata = sessionData.metadata as Record<string, string>

    if (!sessionId) {
      strapi.log.warn(
        `[Webhook] Missing session ID in checkout.session.completed | correlationId=${correlationId}`
      )
      return
    }

    strapi.log.info(
      `[Webhook] Processing checkout.session.completed | sessionId=${sessionId}, correlationId=${correlationId}`
    )

    // Find the order by session ID
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerSessionId: sessionId },
      populate: {
        event: {
          fields: [
            "id",
            "documentId",
            "name",
            "slug",
            "start",
            "end",
            "contactEmail",
            "description",
            "eventStatus",
          ],
          populate: {
            ticketTypes: true,
            location: { fields: ["name", "country"] },
            venue: {
              fields: ["name", "website", "location"],
            },
          },
        },
        player: true,
        discountCode: true,
      },
    })

    if (!order) {
      strapi.log.warn(
        `[Webhook] Order not found for session: ${sessionId} | correlationId=${correlationId}`
      )
      return
    }

    const orderNumber = order.orderNumber
    const eventName = order.event?.name || "unknown"

    // IDEMPOTENCY: Use atomic conditional update to prevent duplicate processing
    // If two webhooks arrive simultaneously, only one will succeed in changing status
    const knex = strapi.db.connection
    const updateResult = await knex(TABLES.ticketOrders)
      .where("document_id", order.documentId)
      .where("order_status", "pending")
      .update({ order_status: "processing" })

    if (updateResult === 0) {
      // Either order was already processed or is being processed by another webhook
      // Re-fetch the order to get the current status for accurate logging
      const currentOrder = await strapi.documents("api::ticket-order.ticket-order").findFirst({
        filters: { documentId: order.documentId },
        fields: ["orderStatus"],
      })
      const currentStatus = currentOrder?.orderStatus || "unknown"
      // Surface this as `warn` + a Prometheus counter rather than `info` because
      // a non-pending order receiving a `checkout.session.completed` is almost
      // always a recoverable incident — usually the cleanup cron expired the
      // order before a delayed/retried webhook arrived (e.g. after a webhook
      // URL change or signing-secret rotation). Without alerting on this we
      // discover the problem only when a customer asks where their tickets are.
      // See `.claude/skills/stripe-webhook-replay/SKILL.md` for the recovery.
      strapi.log.warn(
        `[Webhook] Order ${orderNumber} skipped - current status: ${currentStatus} (was not pending) | event=${eventName}, correlationId=${correlationId}`
      )
      webhookProcessingTotal.inc({
        event_type: "checkout.session.completed",
        status: "skipped_terminal",
      })
      return
    }

    strapi.log.info(
      `[Webhook] Processing order ${orderNumber} (locked with processing status) | event=${eventName}, correlationId=${correlationId}`
    )

    try {
      const ticketDetails = order.ticketDetails || []
      const attendeeDetails = (order.attendeeDetails || []) as AttendeeInfo[]

      // Track created tickets for confirmation email
      const createdTickets: Array<{
        ticketCode: string
        ticketTypeName: string
        attendeeName: string
        attendeeEmail: string
        player: any
        isNewPlayer: boolean
      }> = []

      // Keep track of total tickets created per ticket type for sold count updates
      const ticketTypeQuantities = new Map<string, number>()

      // Create tickets - use attendee details if available, otherwise fall back to purchaser info
      let ticketIndex = 0
      for (const detail of ticketDetails as any[]) {
        const ticketType = order.event?.ticketTypes?.find(
          (tt: any) => tt.documentId === detail.ticketTypeId
        )

        if (!ticketType) {
          strapi.log.warn(`[Webhook] Ticket type not found: ${detail.ticketTypeId}`)
          continue
        }

        // Create individual tickets
        for (let i = 0; i < detail.quantity; i++) {
          // Get attendee info for this ticket (if available)
          const attendee = attendeeDetails[ticketIndex]
          let attendeeName: string
          let attendeeEmail: string
          let attendeeInfo: any = null
          let ticketPlayer: any = null
          let isNewPlayer = false

          if (attendee) {
            // Use collected attendee information
            attendeeName = `${attendee.firstName} ${attendee.lastName}`
            attendeeEmail = attendee.email

            // Build attendeeInfo component data
            attendeeInfo = {
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              email: attendee.email,
              tshirtSize: attendee.tshirtSize || "none",
              foodPreferences: attendee.foodPreferences || null,
              photoConsent: attendee.photoConsent,
              photoConsentTimestamp: attendee.photoConsentTimestamp || null,
            }

            // Find or create player for this attendee using shared service
            const playerResult = await findOrCreatePlayerForAttendee(
              strapi,
              attendee,
              order.player,
              "[Webhook]"
            )
            ticketPlayer = playerResult.player
            isNewPlayer = playerResult.isNew
          } else {
            // Fall back to purchaser info (legacy behavior)
            attendeeName = order.purchaserName
            attendeeEmail = order.purchaserEmail
            ticketPlayer = order.player
          }

          const ticket = await strapi.documents("api::ticket.ticket").create({
            data: {
              ticketCode: generateTicketCode(),
              ticketStatus: "valid",
              attendeeName,
              attendeeEmail,
              attendeeInfo,
              ticketType: ticketType.id,
              order: order.id,
              player: ticketPlayer?.id || null,
              event: order.event.id,
            } as any,
          })

          createdTickets.push({
            ticketCode: ticket.ticketCode,
            ticketTypeName: ticketType.name,
            attendeeName,
            attendeeEmail,
            player: ticketPlayer,
            isNewPlayer,
          })

          // Track quantity for this ticket type
          const currentCount = ticketTypeQuantities.get(ticketType.documentId) || 0
          ticketTypeQuantities.set(ticketType.documentId, currentCount + 1)

          ticketIndex++
        }
      }

      // Confirm reservations - converts reserved tickets to sold
      // This atomically decrements reservedCount and increments soldCount
      await confirmReservations(strapi, order.documentId, ticketTypeQuantities)

      // Update order status to paid (from processing)
      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: order.documentId,
        data: {
          orderStatus: "paid",
          providerOrderId: paymentIntent,
          paidAt: new Date().toISOString(),
        } as any,
      })

      // Confirm discount code usage if applicable - moves reserved to used atomically
      // SECURITY: Uses atomic confirmDiscountCode to ensure correct count even with concurrent requests
      if (order.discountCode?.documentId) {
        // hasReservation indicates whether the order had an active reservation at checkout time
        const hadReservation = (order as any).hasReservation
        await confirmDiscountCode(strapi, order.discountCode.documentId, hadReservation)
        strapi.log.info(
          `[Webhook] Discount code ${(order.discountCode as any).code} usage confirmed | order=${orderNumber}, correlationId=${correlationId}`
        )
      }

      // Add all ticket players to event attendees
      const playersToAddToEvent = new Set<string>()
      for (const ticket of createdTickets) {
        if (ticket.player?.documentId) {
          playersToAddToEvent.add(ticket.player.documentId)
        }
      }

      for (const playerDocId of playersToAddToEvent) {
        await addPlayerToEventAttendees(strapi, playerDocId, order.event, "[Webhook]")
      }

      // Send confirmation email to purchaser
      await this.sendConfirmationEmail(order, createdTickets)

      // Send invitation emails to new players (attendees who got a new profile created)
      for (const ticket of createdTickets) {
        if (ticket.isNewPlayer && ticket.player) {
          // Don't send invitation to purchaser (they already got confirmation email)
          if (ticket.attendeeEmail.toLowerCase() !== order.purchaserEmail.toLowerCase()) {
            await this.sendPlayerInvitationEmail(
              ticket.attendeeEmail,
              ticket.attendeeName,
              ticket.player,
              ticket.ticketCode,
              order.event
            )
          }
        }
      }

      // Notify event organizers about the sale
      await this.sendTicketSoldNotificationEmail(order, createdTickets)

      // Trigger frontend revalidation to update participant list on event page
      await triggerFrontendRevalidation("event", order.event.slug, strapi)

      const handlerDurationMs = handlerTimer.elapsed()
      strapi.log.info(
        `[Webhook] Order ${orderNumber} completed successfully | ticketCount=${createdTickets.length}, event=${eventName}, durationMs=${handlerDurationMs}, correlationId=${correlationId}`
      )
    } catch (error: any) {
      // Processing failed - revert status back to pending so webhook can be retried
      const handlerDurationMs = handlerTimer.elapsed()
      strapi.log.error(
        `[Webhook] Failed to process order ${orderNumber}: ${error.message} | handler=checkout_completed, event=${eventName}, sessionId=${sessionId}, durationMs=${handlerDurationMs}, correlationId=${correlationId}, stack=${error.stack}`
      )

      await knex(TABLES.ticketOrders)
        .where("document_id", order.documentId)
        .where("order_status", "processing")
        .update({ order_status: "pending" })

      strapi.log.info(
        `[Webhook] Order ${orderNumber} status reverted to pending for retry | correlationId=${correlationId}`
      )

      // Re-throw to signal failure to Stripe (will retry webhook)
      throw error
    }
  },

  /**
   * Send invitation email to a newly created player with calendar attachment.
   * Delegates to the shared service so all email-sending logic (user creation,
   * reset token, metrics) lives in one place.
   */
  async sendPlayerInvitationEmail(
    email: string,
    playerName: string,
    player: any,
    ticketCode: string,
    event: any
  ) {
    await sendPlayerInvitationNotification(strapi, email, playerName, player, ticketCode, event)
  },

  /**
   * Notify event organizers when tickets are sold
   */
  async sendTicketSoldNotificationEmail(
    order: any,
    createdTickets: Array<{
      ticketCode: string
      ticketTypeName: string
      attendeeName: string
      attendeeEmail: string
      player: any
      isNewPlayer: boolean
    }>
  ) {
    await sendTicketSoldNotification(strapi, order, createdTickets)
  },

  /**
   * Handle expired checkout session (user abandoned checkout)
   */
  async handleCheckoutExpired(
    sessionData: Record<string, unknown>,
    correlationId: string = generateCorrelationId()
  ) {
    const sessionId = sessionData.id as string

    if (!sessionId) {
      strapi.log.warn(
        `[Webhook] Missing session ID in checkout.session.expired | correlationId=${correlationId}`
      )
      return
    }

    // Find the order by session ID
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerSessionId: sessionId },
      populate: {
        event: { fields: ["id", "documentId", "name"] },
        discountCode: { fields: ["documentId", "code"] },
      },
    })

    if (!order) {
      strapi.log.info(
        `[Webhook] No order found for expired session: ${sessionId} | correlationId=${correlationId}`
      )
      return
    }

    const orderNumber = order.orderNumber
    const eventName = order.event?.name || "unknown"

    if (order.orderStatus !== "pending") {
      strapi.log.info(
        `[Webhook] Order ${orderNumber} not pending (status: ${order.orderStatus}), skipping expiration | event=${eventName}, correlationId=${correlationId}`
      )
      return
    }

    // Release any ticket reservations before marking expired
    await releaseReservations(strapi, order.documentId)

    // Release any discount code reservation
    if (order.discountCode?.documentId) {
      await releaseDiscountCode(strapi, order.discountCode.documentId)
      strapi.log.info(
        `[Webhook] Released discount code reservation for ${order.discountCode.code} | order=${orderNumber}, correlationId=${correlationId}`
      )
    }

    // Update order status to expired
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: order.documentId,
      data: {
        orderStatus: "expired",
      } as any,
    })

    strapi.log.info(
      `[Webhook] Order ${orderNumber} marked as expired (checkout abandoned) | event=${eventName}, correlationId=${correlationId}`
    )
  },

  /**
   * Handle failed payment intent
   */
  async handlePaymentFailed(
    paymentIntentData: Record<string, unknown>,
    correlationId: string = generateCorrelationId()
  ) {
    const paymentIntentId = paymentIntentData.id as string
    const lastPaymentError = paymentIntentData.last_payment_error as Record<string, unknown> | null
    const errorMessage = (lastPaymentError?.message as string) || "Payment failed"
    const errorCode = (lastPaymentError?.code as string) || "unknown"

    if (!paymentIntentId) {
      strapi.log.warn(
        `[Webhook] Missing payment intent ID in payment_intent.payment_failed | correlationId=${correlationId}`
      )
      return
    }

    // Find the order by payment intent (stored in providerOrderId after checkout completion)
    let order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerOrderId: paymentIntentId },
      populate: {
        event: { fields: ["id", "documentId", "name", "slug"] },
        discountCode: { fields: ["documentId", "code"] },
      },
    })

    // If not found by providerOrderId, try looking up via session metadata
    // This handles cases where payment fails during checkout (before completion)
    if (!order) {
      const provider = getPaymentProvider("stripe")
      if (provider.getSessionByPaymentIntent) {
        const sessionData = await provider.getSessionByPaymentIntent(paymentIntentId)
        if (sessionData?.orderId) {
          order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
            filters: { documentId: sessionData.orderId },
            populate: {
              event: { fields: ["id", "documentId", "name", "slug"] },
              discountCode: { fields: ["documentId", "code"] },
            },
          })
        }
      }
    }

    // Fallback: try finding by providerSessionId containing payment intent
    if (!order) {
      order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
        filters: { providerSessionId: { $contains: paymentIntentId } },
        populate: {
          event: { fields: ["id", "documentId", "name", "slug"] },
          discountCode: { fields: ["documentId", "code"] },
        },
      })
    }

    if (!order) {
      strapi.log.info(
        `[Webhook] No order found for failed payment intent: ${paymentIntentId} | correlationId=${correlationId}`
      )
      return
    }

    const orderNumber = order.orderNumber
    const eventName = order.event?.name || "unknown"

    // Log the failure details
    strapi.log.warn(
      `[Webhook] Payment failed for order ${orderNumber}: ${errorCode} - ${errorMessage} | event=${eventName}, paymentIntentId=${paymentIntentId}, correlationId=${correlationId}`
    )

    // Update order with failure info if still pending
    if (order.orderStatus === "pending") {
      // Release any ticket reservations before marking failed
      await releaseReservations(strapi, order.documentId)

      // Release any discount code reservation
      if (order.discountCode?.documentId) {
        await releaseDiscountCode(strapi, order.discountCode.documentId)
        strapi.log.info(
          `[Webhook] Released discount code reservation for ${order.discountCode.code} | order=${orderNumber}, correlationId=${correlationId}`
        )
      }

      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: order.documentId,
        data: {
          orderStatus: "failed",
          notes: `Payment failed: ${errorCode} - ${errorMessage}`,
        } as any,
      })

      strapi.log.info(
        `[Webhook] Order ${orderNumber} marked as failed | event=${eventName}, errorCode=${errorCode}, correlationId=${correlationId}`
      )

      // Optionally send failure notification email
      await this.sendPaymentFailedEmail(order, errorMessage, correlationId)
    }
  },

  /**
   * Send payment failure notification email.
   * Delegates to the shared email template service which owns rendering,
   * metrics, and error handling.
   */
  async sendPaymentFailedEmail(
    order: any,
    errorMessage: string,
    correlationId: string = generateCorrelationId()
  ) {
    await sendPaymentFailedNotification(strapi, order, errorMessage, correlationId)
  },

  /**
   * Handle charge refund (initiated from Stripe dashboard)
   */
  async handleChargeRefunded(
    chargeData: Record<string, unknown>,
    correlationId: string = generateCorrelationId()
  ) {
    const paymentIntent = chargeData.payment_intent as string
    // Amounts are in minor units (e.g. cents); keep them in that form for
    // comparison, and only convert to major units for the stored refund amount.
    const amountRefundedMinor = (chargeData.amount_refunded as number) || 0
    const amountTotalMinor = (chargeData.amount as number) || 0
    const isPartialRefund = amountRefundedMinor > 0 && amountRefundedMinor < amountTotalMinor
    const newOrderStatus: "refunded" | "partially_refunded" = isPartialRefund
      ? "partially_refunded"
      : "refunded"
    const amountRefunded = amountRefundedMinor / 100

    // Resolve a refund reason from either the top-level `reason` (manual
    // refunds from the Stripe dashboard often set this) or from the first
    // entry of the `refunds.data[]` collection when available.
    const topLevelReason =
      typeof chargeData.reason === "string" && chargeData.reason ? chargeData.reason : null
    const refundsList = (chargeData.refunds as { data?: Array<{ reason?: string | null }> }) || {}
    const firstRefundReason =
      refundsList.data && refundsList.data.length > 0 ? refundsList.data[0]?.reason || null : null
    const refundReason = topLevelReason || firstRefundReason || null

    if (!paymentIntent) {
      strapi.log.warn(
        `[Webhook] Missing payment_intent in charge.refunded | correlationId=${correlationId}`
      )
      return
    }

    // Find the order by payment intent
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerOrderId: paymentIntent },
      populate: {
        tickets: {
          populate: { ticketType: { fields: ["documentId"] } },
        },
        player: true,
        event: { fields: ["id", "documentId", "name", "slug"] },
      },
    })

    if (!order) {
      strapi.log.warn(
        `[Webhook] Order not found for payment intent: ${paymentIntent} | correlationId=${correlationId}`
      )
      return
    }

    const orderNumber = order.orderNumber
    const eventName = order.event?.name || "unknown"
    const ticketCount = order.tickets?.length || 0

    // Early-return guard: treat both fully- and partially-refunded orders as
    // already processed to avoid duplicate ticket/attendee mutations when
    // Stripe replays the webhook.
    if (order.orderStatus === "refunded" || order.orderStatus === "partially_refunded") {
      strapi.log.info(
        `[Webhook] Order ${orderNumber} already ${order.orderStatus} | event=${eventName}, correlationId=${correlationId}`
      )
      return
    }

    // Update order status
    const orderUpdateData: Record<string, unknown> = {
      orderStatus: newOrderStatus,
      refundedAt: new Date().toISOString(),
      refundAmount: amountRefunded,
    }
    if (refundReason) {
      orderUpdateData.refundReason = refundReason
    }

    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: order.documentId,
      data: orderUpdateData as any,
    })

    // For full refunds, update all tickets to refunded and decrement sold
    // counts. Partial refunds don't map cleanly to per-ticket states, so we
    // keep tickets as-is and just record the order-level state.
    //
    // TODO(ticketing): partial refunds leave sold_count inflated for the
    // affected ticket types. For low-capacity events this could block future
    // sales. Revisit by either (a) requiring the refund flow to void specific
    // tickets before partially refunding, or (b) reconciling sold_count from
    // non-refunded tickets on a cron.
    if (!isPartialRefund) {
      const ticketTypeCounts = new Map<string, number>()
      for (const ticket of order.tickets || []) {
        await strapi.documents("api::ticket.ticket").update({
          documentId: ticket.documentId,
          data: { ticketStatus: "refunded" } as any,
        })

        // Count tickets per ticket type for sold_count decrement
        if (ticket.ticketType?.documentId) {
          const current = ticketTypeCounts.get(ticket.ticketType.documentId) || 0
          ticketTypeCounts.set(ticket.ticketType.documentId, current + 1)
        }
      }

      // Decrement sold_count for each ticket type
      for (const [ticketTypeDocumentId, count] of ticketTypeCounts) {
        await strapi.db
          .connection(TABLES.ticketTypes)
          .where("document_id", ticketTypeDocumentId)
          .decrement("sold_count", count)
      }

      // Remove player from event attendees — but only if this refund zeroes out
      // their attendance. A purchaser who holds multiple paid orders for the
      // same event (e.g. bought seats in separate sessions) must stay on the
      // attendees list until the last one is refunded.
      if (order.player && order.event) {
        const otherPaidOrders = await strapi.documents("api::ticket-order.ticket-order").count({
          filters: {
            event: { documentId: order.event.documentId },
            player: { documentId: order.player.documentId },
            orderStatus: "paid",
            documentId: { $ne: order.documentId },
          },
        })

        if (otherPaidOrders === 0) {
          const playerDoc = await strapi.documents("api::player.player").findOne({
            documentId: order.player.documentId,
            populate: { attended: { fields: ["id", "documentId"] } },
          })

          if (playerDoc) {
            const updatedAttended = (playerDoc.attended || []).filter(
              (e: any) => e.documentId !== order.event.documentId
            )

            await strapi.documents("api::player.player").update({
              documentId: order.player.documentId,
              data: {
                attended: updatedAttended.map((e: any) => e.id),
              } as any,
            })
          }
        } else {
          strapi.log.info(
            `[Webhook] Keeping player ${order.player.documentId} on event ${order.event.documentId} — ${otherPaidOrders} other paid order(s) remain | correlationId=${correlationId}`
          )
        }
      }
    }

    // Trigger frontend revalidation to update participant list on event page
    if (order.event?.slug) {
      await triggerFrontendRevalidation("event", order.event.slug, strapi)
    }

    strapi.log.info(
      `[Webhook] Order ${orderNumber} ${newOrderStatus} via Stripe dashboard | event=${eventName}, ticketCount=${ticketCount}, refundedAmount=${amountRefunded}, correlationId=${correlationId}`
    )
  },

  /**
   * Handle Stripe Connect account updates
   */
  async handleAccountUpdated(
    accountData: Record<string, unknown>,
    correlationId: string = generateCorrelationId()
  ) {
    const stripeAccountId = accountData.id as string
    const chargesEnabled = accountData.charges_enabled as boolean
    const payoutsEnabled = accountData.payouts_enabled as boolean
    const detailsSubmitted = accountData.details_submitted as boolean

    if (!stripeAccountId) {
      strapi.log.warn(
        `[Webhook] Missing account ID in account.updated | correlationId=${correlationId}`
      )
      return
    }

    // Find the stripe account in our database
    const stripeAccount = await strapi.documents("api::stripe-account.stripe-account").findFirst({
      filters: { stripeAccountId },
    })

    if (!stripeAccount) {
      strapi.log.warn(
        `[Webhook] Stripe account not found: ${stripeAccountId} | correlationId=${correlationId}`
      )
      return
    }

    // Snapshot the previous status before computing the new one so we can
    // detect transitions and notify the host when the status changes.
    const previousStatus = (stripeAccount.accountStatus || "pending") as
      | "pending"
      | "active"
      | "restricted"
      | "disabled"

    // Determine account status based on capabilities
    let accountStatus: "pending" | "active" | "restricted" | "disabled" = "pending"
    if (chargesEnabled && payoutsEnabled) {
      accountStatus = "active"
    } else if (detailsSubmitted) {
      accountStatus = "restricted"
    }

    // Update the account in our database
    const updateData: any = {
      accountStatus,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
    }

    // Set onboarding completed timestamp when details are first submitted
    if (detailsSubmitted && !stripeAccount.onboardingCompletedAt) {
      updateData.onboardingCompletedAt = new Date().toISOString()
    }

    await strapi.documents("api::stripe-account.stripe-account").update({
      documentId: stripeAccount.documentId,
      data: updateData,
    })

    strapi.log.info(
      `[Webhook] Stripe account ${stripeAccountId} updated | status=${accountStatus}, chargesEnabled=${chargesEnabled}, payoutsEnabled=${payoutsEnabled}, correlationId=${correlationId}`
    )

    // Notify the host when the account status changes. The helper itself
    // handles the `pending` landing state and missing host-email guards.
    // Build the payload explicitly — spreading the full Strapi document
    // (with createdAt / publishedAt / id / etc.) leaks internals and would
    // quietly regress if the helper's accepted shape ever narrows.
    if (accountStatus !== previousStatus) {
      await sendStripeAccountStatusEmail(
        strapi,
        {
          documentId: stripeAccount.documentId,
          stripeAccountId: stripeAccount.stripeAccountId,
          chargesEnabled: updateData.chargesEnabled,
          payoutsEnabled: updateData.payoutsEnabled,
          detailsSubmitted: updateData.detailsSubmitted,
        },
        previousStatus,
        accountStatus
      )
    }
  },

  /**
   * Send order confirmation email with calendar attachment and invoice PDF.
   * Delegates to the shared email template service which owns rendering,
   * invoice generation, metrics, and error handling.
   */
  async sendConfirmationEmail(
    order: any,
    createdTickets?: Array<{
      ticketCode: string
      ticketTypeName: string
      attendeeName: string
      attendeeEmail: string
      player: any
      isNewPlayer: boolean
    }>
  ) {
    let tickets = createdTickets

    // Legacy path: no createdTickets passed in → fetch from the database so
    // the service still receives a full list.
    if (!tickets) {
      const dbTickets = await strapi.documents("api::ticket.ticket").findMany({
        filters: { order: { id: order.id } },
        populate: {
          ticketType: { fields: ["name"] },
        },
      })
      tickets = dbTickets.map((t: any) => ({
        ticketCode: t.ticketCode,
        ticketTypeName: t.ticketType?.name || "Ticket",
        attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail,
        player: null,
        isNewPlayer: false,
      }))
    }

    await sendOrderConfirmationEmail(strapi, order, tickets)
  },

  /**
   * Determine if an error is retryable (Stripe should retry the webhook).
   * Prefers structured signals (error.code, constructor name) over substring
   * matches on human-readable messages — the old "email"/"SMTP" message
   * checks would silently swallow any DB error mentioning those words
   * (e.g. a constraint error on an `email` column).
   */
  isRetryableError(error: any): boolean {
    // Database connection / deadlock codes — always retryable.
    const RETRYABLE_CODES = new Set([
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EAI_AGAIN",
      // Postgres: deadlock_detected, serialization_failure, lock_not_available
      "40P01",
      "40001",
      "55P03",
    ])
    if (typeof error?.code === "string" && RETRYABLE_CODES.has(error.code)) {
      return true
    }

    // Strapi validation / application errors — non-retryable. Strapi raises
    // ValidationError / ApplicationError with a stable `name` property, so
    // we can identify them without grepping error.message.
    const NON_RETRYABLE_NAMES = new Set([
      "ValidationError",
      "ApplicationError",
      "YupValidationError",
      "NotFoundError",
      "ForbiddenError",
    ])
    if (typeof error?.name === "string" && NON_RETRYABLE_NAMES.has(error.name)) {
      return false
    }

    // Email-send failures come through Strapi's email plugin, which wraps
    // provider errors in a SendMailError (nodemailer) or raises its own
    // error name. Treat them as non-retryable — the order is already paid
    // and recoverable, and retrying a broken transport won't help.
    if (
      typeof error?.name === "string" &&
      (error.name === "SendMailError" || error.name.startsWith("Mailer"))
    ) {
      return false
    }

    // Generic network-layer errors (fetch AbortError, undici timeout) —
    // retryable. Match on error class names, not message text.
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      return true
    }

    // Default to retryable for unknown errors (safer to retry).
    return true
  },
})
