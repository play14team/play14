/**
 * Webhook controller for handling Stripe payment events
 *
 * This controller processes Stripe webhooks with comprehensive observability:
 * - Prometheus metrics for monitoring
 * - Structured logging with timing information
 * - Correlation IDs for request tracing
 */

import { randomBytes } from "node:crypto"
import { join } from "node:path"
import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import PlayerInvitationEmail from "../../../emails/player-invitation"
import {
  generateEventICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "../../../libs/calendar"
import { formatTicketItems, generateInvoicePDF, type InvoiceData } from "../../../libs/invoice"
import { nameToUsername } from "../../../libs/strings"
import { generateTicketCode } from "../../../libs/tickets"
import { sendTicketSoldNotificationEmail as sendTicketSoldNotification } from "../../../services/email-templates"
import { generateCorrelationId, startTimer } from "../../../services/observability/logger"
import {
  emailSendDuration,
  emailSendTotal,
  webhookProcessingDuration,
  webhookProcessingTotal,
} from "../../../services/observability/metrics"
import { reportSentryError } from "../../../services/observability/sentry-reporter"
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

const getLogoUrl = (): string => {
  if (process.env.LOGO_URL) {
    return process.env.LOGO_URL
  }
  const publicUrl = process.env.PUBLIC_URL || "http://localhost:1337"
  const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl
  return `${baseUrl}/images/play14_600x200_transparent-light.png`
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
        `[Webhook] Event ${eventId} already processed (status: ${idempotencyResult.status}) - returning success | correlationId=${correlationId}`
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
        `[Webhook] Error processing event ${eventId}: ${error.message} | durationMs=${durationMs}, correlationId=${correlationId}, stack=${error.stack}`
      )

      reportSentryError(strapi, error, {
        tags: { event_type: eventType, module: "webhook", correlationId },
        extra: { eventId, durationMs },
      })

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
    const updateResult = await knex("ticket_orders")
      .where("document_id", order.documentId)
      .where("status", "pending")
      .update({ status: "processing" })

    if (updateResult === 0) {
      // Either order was already processed or is being processed by another webhook
      // Re-fetch the order to get the current status for accurate logging
      const currentOrder = await strapi.documents("api::ticket-order.ticket-order").findFirst({
        filters: { documentId: order.documentId },
        fields: ["status"],
      })
      const currentStatus = currentOrder?.status || "unknown"
      strapi.log.info(
        `[Webhook] Order ${orderNumber} skipped - current status: ${currentStatus} (was not pending) | event=${eventName}, correlationId=${correlationId}`
      )
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
          status: "paid",
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
        `[Webhook] Failed to process order ${orderNumber}: ${error.message} | event=${eventName}, durationMs=${handlerDurationMs}, correlationId=${correlationId}, stack=${error.stack}`
      )

      reportSentryError(strapi, error, {
        tags: { handler: "checkout_completed", module: "webhook", correlationId },
        extra: { orderNumber, eventName, sessionId, handlerDurationMs },
      })

      await knex("ticket_orders")
        .where("document_id", order.documentId)
        .where("status", "processing")
        .update({ status: "pending" })

      strapi.log.info(
        `[Webhook] Order ${orderNumber} status reverted to pending for retry | correlationId=${correlationId}`
      )

      // Re-throw to signal failure to Stripe (will retry webhook)
      throw error
    }
  },

  /**
   * Send invitation email to a newly created player with calendar attachment
   */
  async sendPlayerInvitationEmail(
    email: string,
    playerName: string,
    player: any,
    ticketCode: string,
    event: any
  ) {
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"

    const eventDate = new Date(event.start).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const eventTime = new Date(event.start).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const eventLocation = event.venue
      ? `${event.venue.name}${event.venue.location?.place_name ? ` - ${event.venue.location.place_name}` : ""}`
      : event.location
        ? `${event.location.name}, ${event.location.country}`
        : "Location TBA"

    // Generate password reset token for the player's user account
    const resetToken = randomBytes(64).toString("hex")

    // Find or create the user associated with this player
    let user = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { player: { documentId: player.documentId } },
    })

    if (!user) {
      // No user exists - check if there's a user with this email (not linked to player yet)
      user = await strapi.documents("plugin::users-permissions.user").findFirst({
        filters: { email: { $eqi: email } },
      })

      if (user) {
        // User exists but not linked to player - link them
        await strapi.documents("plugin::users-permissions.user").update({
          documentId: user.documentId,
          data: {
            player: player.id,
            resetPasswordToken: resetToken,
          } as any,
        })
        strapi.log.info(`[Webhook] Linked existing user ${email} to player ${player.documentId}`)
      } else {
        // Create a new user account
        const playerRole = await strapi.documents("plugin::users-permissions.role").findFirst({
          filters: { type: "player" },
        })

        const password = `${randomBytes(16).toString("hex")}!`

        user = await strapi.documents("plugin::users-permissions.user").create({
          data: {
            username: nameToUsername(playerName),
            email,
            password,
            confirmed: true,
            blocked: false,
            provider: "local",
            role: playerRole?.id,
            player: player.id,
            invitationStatus: "pending",
            resetPasswordToken: resetToken,
          } as any,
        })
        strapi.log.info(
          `[Webhook] Created new user account for ${email} and linked to player ${player.documentId}`
        )
      }
    } else {
      // User already exists and is linked - just update the reset token
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: { resetPasswordToken: resetToken } as any,
      })
    }

    // Build reset password URL (similar to user-invitations.ts)
    const callbackUrl = encodeURIComponent("/admin")
    const code = encodeURIComponent(resetToken)
    const resetPasswordUrl = `${frontendUrl}/auth/reset-password?code=${code}&callbackUrl=${callbackUrl}`

    // Generate calendar data
    let icsContent: string | null = null
    let googleCalendarUrl = ""
    let outlookCalendarUrl = ""

    try {
      const eventData = {
        name: event.name,
        slug: event.slug,
        description: event.description,
        start: event.start,
        end: event.end,
        eventStatus: event.eventStatus,
        contactEmail: event.contactEmail,
        venue: event.venue,
      }

      icsContent = await generateEventICS(eventData)
      googleCalendarUrl = generateGoogleCalendarUrl(eventData)
      outlookCalendarUrl = generateOutlookCalendarUrl(eventData)
    } catch (calError: any) {
      // NON-CRITICAL FAILURE: Calendar generation failed but order processing continues.
      // The user will still receive the email, just without calendar links/attachment.
      // TODO: Integrate with monitoring system to track frequency of these failures
      strapi.log.warn(`[Webhook] Failed to generate calendar for invitation: ${calError.message}`)
    }

    try {
      const html = await render(
        PlayerInvitationEmail({
          playerName,
          ticketCode,
          eventName: event.name,
          eventDate,
          eventTime,
          eventLocation,
          resetPasswordUrl,
          googleCalendarUrl,
          outlookCalendarUrl,
          frontendUrl,
        })
      )

      const text = await render(
        PlayerInvitationEmail({
          playerName,
          ticketCode,
          eventName: event.name,
          eventDate,
          eventTime,
          eventLocation,
          resetPasswordUrl,
          googleCalendarUrl,
          outlookCalendarUrl,
          frontendUrl,
        }),
        { plainText: true }
      )

      const emailOptions: any = {
        to: email,
        subject: `[#play14] Your ticket for ${event.name} - Create your profile`,
        html,
        text,
      }

      // Add ICS attachment if generated successfully
      if (icsContent) {
        emailOptions.attachments = [
          {
            filename: `${event.slug || "play14-event"}.ics`,
            content: Buffer.from(icsContent),
            contentType: "text/calendar",
          },
        ]
      }

      await strapi.plugin("email").service("email").send(emailOptions)

      // Update invitation status to prevent duplicate emails from cron job
      // This is critical for multi-container deployments where cron runs on all instances
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: {
          invitationStatus: "sent",
          invitationSentAt: new Date().toISOString(),
        } as any,
      })

      strapi.log.info(`[Webhook] Player invitation email sent to ${email}`)
    } catch (error: any) {
      // NON-CRITICAL FAILURE: Email sending failed but order is still valid.
      // The ticket was created successfully; user just won't receive their invitation email.
      // TODO: Integrate with monitoring/alerting system for:
      // 1. Immediate notification to support team
      // 2. Retry mechanism for failed emails
      // 3. Dashboard to track email delivery rates
      strapi.log.error(
        `[Webhook] Failed to send player invitation email to ${email}: ${error.message}`
      )
    }
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

    if (order.status !== "pending") {
      strapi.log.info(
        `[Webhook] Order ${orderNumber} not pending (status: ${order.status}), skipping expiration | event=${eventName}, correlationId=${correlationId}`
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
        status: "expired",
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
    if (order.status === "pending") {
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
          status: "failed",
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
   * Send payment failure notification email with metrics tracking
   */
  async sendPaymentFailedEmail(
    order: any,
    errorMessage: string,
    correlationId: string = generateCorrelationId()
  ) {
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
    const logoUrl = getLogoUrl()
    const emailTimer = startTimer()

    try {
      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: order.purchaserEmail,
          subject: `[#play14] Payment failed for ${order.event?.name || "your order"}`,
          text: `
Unfortunately, your payment could not be processed.

Order: ${order.orderNumber}
Event: ${order.event?.name || "Unknown"}
Error: ${errorMessage}

Please try again: ${frontendUrl}/events/${order.event?.slug || ""}

If you continue to experience issues, please contact us.

The #play14 Team
        `.trim(),
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #1a1a1a; padding: 30px 20px; text-align: center; }
    .header img { max-width: 200px; height: auto; }
    .content { padding: 30px 20px; background: #ffffff; }
    .error-box { background: #fff3f3; border-left: 4px solid #e53935; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; background: #f5f5f5; color: #666; font-size: 12px; }
    .btn { display: inline-block; background: #f47920; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="#play14" />
    </div>
    <div class="content">
      <h2>Payment Failed</h2>
      <p>Unfortunately, your payment could not be processed.</p>

      <p><strong>Order:</strong> ${order.orderNumber}</p>
      <p><strong>Event:</strong> ${order.event?.name || "Unknown"}</p>

      <div class="error-box">
        <strong>Error:</strong> ${errorMessage}
      </div>

      <p>This can happen for various reasons, such as insufficient funds, incorrect card details, or a temporary issue with your bank.</p>

      <a href="${frontendUrl}/events/${order.event?.slug || ""}" class="btn">Try Again</a>

      <p style="margin-top: 30px;">If you continue to experience issues, please contact us.</p>
    </div>
    <div class="footer">
      <p>The #play14 Team</p>
      <p><a href="${frontendUrl}" style="color: #f47920;">play14.org</a></p>
    </div>
  </div>
</body>
</html>
        `.trim(),
        })

      const durationMs = emailTimer.elapsed()
      emailSendTotal.inc({ email_type: "payment_failed", status: "success" })
      emailSendDuration.observe({ email_type: "payment_failed" }, durationMs / 1000)
      strapi.log.info(
        `[Webhook] Payment failed email sent to ${order.purchaserEmail} | order=${order.orderNumber}, durationMs=${durationMs}, correlationId=${correlationId}`
      )
    } catch (error: any) {
      const durationMs = emailTimer.elapsed()
      emailSendTotal.inc({ email_type: "payment_failed", status: "error" })
      emailSendDuration.observe({ email_type: "payment_failed" }, durationMs / 1000)
      strapi.log.error(
        `[Webhook] Failed to send payment failed email: ${error.message} | order=${order.orderNumber}, to=${order.purchaserEmail}, durationMs=${durationMs}, correlationId=${correlationId}`
      )
      reportSentryError(strapi, error, {
        tags: { email_type: "payment_failed", module: "webhook", correlationId },
        extra: { orderNumber: order.orderNumber, recipientEmail: order.purchaserEmail },
      })
    }
  },

  /**
   * Handle charge refund (initiated from Stripe dashboard)
   */
  async handleChargeRefunded(
    chargeData: Record<string, unknown>,
    correlationId: string = generateCorrelationId()
  ) {
    const paymentIntent = chargeData.payment_intent as string
    const amountRefunded = (chargeData.amount_refunded as number) / 100

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

    if (order.status === "refunded") {
      strapi.log.info(
        `[Webhook] Order ${orderNumber} already refunded | event=${eventName}, correlationId=${correlationId}`
      )
      return
    }

    // Update order status
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: order.documentId,
      data: {
        status: "refunded",
        refundedAt: new Date().toISOString(),
        refundAmount: amountRefunded,
      } as any,
    })

    // Update all tickets to refunded and decrement sold counts
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
        .connection("ticket_types")
        .where("document_id", ticketTypeDocumentId)
        .decrement("sold_count", count)
    }

    // Remove player from event attendees
    if (order.player && order.event) {
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
    }

    // Trigger frontend revalidation to update participant list on event page
    if (order.event?.slug) {
      await triggerFrontendRevalidation("event", order.event.slug, strapi)
    }

    strapi.log.info(
      `[Webhook] Order ${orderNumber} refunded via Stripe dashboard | event=${eventName}, ticketCount=${ticketCount}, refundedAmount=${amountRefunded}, correlationId=${correlationId}`
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
  },

  /**
   * Send order confirmation email with calendar attachment and invoice PDF
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
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
    // Logo URL must be publicly accessible for email clients
    const logoUrl = getLogoUrl()

    let tickets: any[]

    if (createdTickets) {
      // Use pre-built ticket data
      tickets = createdTickets
    } else {
      // Fetch tickets for the order (legacy path)
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
      }))
    }

    // Build ticket list for plain text
    const ticketList = tickets
      .map((t) => `- ${t.ticketTypeName}: ${t.ticketCode} (${t.attendeeName})`)
      .join("\n")

    // Build ticket list for HTML - show attendee names for each ticket
    const ticketListHtml = tickets
      .map(
        (t) =>
          `<li>
            <strong>${t.ticketTypeName}</strong>: <code>${t.ticketCode}</code>
            <br/><span style="color: #666; font-size: 13px;">Attendee: ${t.attendeeName}</span>
          </li>`
      )
      .join("")

    // Generate calendar data
    let icsContent: string | null = null
    let googleCalendarUrl = ""
    let outlookCalendarUrl = ""

    try {
      const eventData = {
        name: order.event.name,
        slug: order.event.slug,
        description: order.event.description,
        start: order.event.start,
        end: order.event.end,
        eventStatus: order.event.eventStatus,
        contactEmail: order.event.contactEmail,
        venue: order.event.venue,
      }

      icsContent = await generateEventICS(eventData)
      googleCalendarUrl = generateGoogleCalendarUrl(eventData)
      outlookCalendarUrl = generateOutlookCalendarUrl(eventData)
    } catch (calError: any) {
      // NON-CRITICAL FAILURE: Calendar generation failed but email will still be sent.
      // TODO: Integrate with monitoring system to track frequency of these failures
      strapi.log.warn(`[Webhook] Failed to generate calendar data: ${calError.message}`)
    }

    // Generate invoice PDF
    let invoicePDF: Buffer | null = null

    try {
      const invoiceData: InvoiceData = {
        orderNumber: order.orderNumber,
        invoiceNumber: order.orderNumber, // Use order number as invoice number
        invoiceDate: order.paidAt || new Date().toISOString(),
        purchaserName: order.purchaserName,
        purchaserEmail: order.purchaserEmail,
        eventName: order.event.name,
        eventDate: new Date(order.event.start).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        eventLocation: order.event.venue
          ? `${order.event.venue.name}${order.event.venue.location?.place_name ? ` - ${order.event.venue.location.place_name}` : ""}`
          : order.event.location
            ? `${order.event.location.name}, ${order.event.location.country}`
            : "Location TBA",
        tickets: formatTicketItems(order.ticketDetails || []),
        subtotal: order.originalAmount || order.totalAmount,
        discountAmount: order.discountAmount || 0,
        totalAmount: order.totalAmount,
        currency: order.currency,
        paymentMethod: "Stripe",
        notes: order.notes || undefined,
      }

      // Logo path - anchor to app root so it works in both src and dist builds
      const logoPath = join(process.cwd(), "public/images/play14_600x200_transparent-light.png")

      invoicePDF = await generateInvoicePDF(invoiceData, {
        organizationName: "#play14",
        organizationWebsite: "https://play14.org",
        // Use event contact email in invoice, fallback to team@play14.org
        organizationEmail: order.event.contactEmail || "team@play14.org",
        logoPath,
      })

      strapi.log.info(`[Webhook] Invoice PDF generated for order ${order.orderNumber}`)
    } catch (invoiceError: any) {
      // NON-CRITICAL FAILURE: Invoice generation failed but email will still be sent.
      // The customer paid successfully and will receive ticket codes without invoice.
      strapi.log.warn(`[Webhook] Failed to generate invoice PDF: ${invoiceError.message}`)
    }

    // Format event date for display
    const eventDate = new Date(order.event.start).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const eventTime = new Date(order.event.start).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const eventLocation = order.event.venue
      ? `${order.event.venue.name}${order.event.venue.location?.place_name ? ` - ${order.event.venue.location.place_name}` : ""}`
      : order.event.location
        ? `${order.event.location.name}, ${order.event.location.country}`
        : "Location TBA"

    // Calendar section HTML
    const calendarSectionHtml = `
      <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h3 style="margin-top: 0; color: #1976d2;">Add to Your Calendar</h3>
        <p style="margin-bottom: 15px;">
          <strong>Date:</strong> ${eventDate} at ${eventTime}<br/>
          <strong>Location:</strong> ${eventLocation}
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${googleCalendarUrl ? `<a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285f4; color: #ffffff !important; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 13px;">Google Calendar</a>` : ""}
          ${outlookCalendarUrl ? `<a href="${outlookCalendarUrl}" target="_blank" style="display: inline-block; background: #0078d4; color: #ffffff !important; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 13px;">Outlook</a>` : ""}
        </div>
        <p style="margin-top: 12px; margin-bottom: 0; font-size: 12px; color: #666;">
          An .ics calendar file is also attached to this email for other calendar apps.
        </p>
      </div>
    `

    try {
      const emailOptions: any = {
        to: order.purchaserEmail,
        subject: `[#play14] Your tickets for ${order.event.name}`,
        text: `
Thank you for your purchase!

Order: ${order.orderNumber}
Event: ${order.event.name}
Date: ${eventDate} at ${eventTime}
Location: ${eventLocation}
Amount: ${order.currency} ${order.totalAmount.toFixed(2)}

Your tickets:
${ticketList}

Add to your calendar:
- Google Calendar: ${googleCalendarUrl}
- Outlook: ${outlookCalendarUrl}

View your tickets: ${frontendUrl}/admin/tickets
${order.event.contactEmail ? `\nQuestions about the event? Contact the organizers at ${order.event.contactEmail}` : ""}

See you at the event!

The #play14 Team
        `.trim(),
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #1a1a1a; padding: 30px 20px; text-align: center; }
    .header img { max-width: 200px; height: auto; }
    .content { padding: 30px 20px; background: #ffffff; }
    .tickets { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .tickets ul { margin: 0; padding: 0; list-style: none; }
    .tickets li { padding: 12px 0; border-bottom: 1px solid #eee; }
    .tickets li:last-child { border-bottom: none; }
    .footer { text-align: center; padding: 20px; background: #f5f5f5; color: #666; font-size: 12px; }
    code { background: #fff3e0; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #f47920; }
    .btn { display: inline-block; background: #f47920; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    h2 { color: #333; margin-top: 0; }
    h3 { color: #333; margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="#play14" />
    </div>
    <div class="content">
      <h2>Thank you for your purchase!</h2>
      <p><strong>Order:</strong> ${order.orderNumber}</p>
      <p><strong>Event:</strong> ${order.event.name}</p>
      <p><strong>Amount:</strong> ${order.currency} ${order.totalAmount.toFixed(2)}</p>

      <div class="tickets">
        <h3>Your Tickets</h3>
        <ul>
          ${ticketListHtml}
        </ul>
      </div>

      ${calendarSectionHtml}

      <p>Keep these ticket codes safe - you'll need them for check-in at the event.</p>

      ${order.event.contactEmail ? `<p>If you have any questions about the event, contact the organizers at <a href="mailto:${order.event.contactEmail}" style="color: #f47920;">${order.event.contactEmail}</a></p>` : ""}

      <a href="${frontendUrl}/admin/tickets" class="btn">View Your Tickets</a>
    </div>
    <div class="footer">
      <p>See you at the event!</p>
      <p>The #play14 Team</p>
      <p><a href="${frontendUrl}" style="color: #f47920;">play14.org</a></p>
    </div>
  </div>
</body>
</html>
        `.trim(),
      }

      // Add attachments if generated successfully
      const attachments: any[] = []

      if (icsContent) {
        attachments.push({
          filename: `${order.event.slug || "play14-event"}.ics`,
          content: Buffer.from(icsContent),
          contentType: "text/calendar",
        })
      }

      if (invoicePDF) {
        attachments.push({
          filename: `invoice-${order.orderNumber}.pdf`,
          content: invoicePDF,
          contentType: "application/pdf",
        })
      }

      if (attachments.length > 0) {
        emailOptions.attachments = attachments
      }

      const emailStartTime = Date.now()
      await strapi.plugin("email").service("email").send(emailOptions)
      const emailDuration = Date.now() - emailStartTime

      emailSendTotal.inc({ email_type: "confirmation", status: "success" })
      emailSendDuration.observe({ email_type: "confirmation" }, emailDuration / 1000)
      strapi.log.info(
        `[Webhook] Confirmation email sent to ${order.purchaserEmail} | order=${order.orderNumber}, durationMs=${emailDuration}`
      )
    } catch (error: any) {
      // NON-CRITICAL FAILURE: Email sending failed but order is still valid and tickets created.
      // This is a serious issue as the customer paid but won't receive confirmation.
      emailSendTotal.inc({ email_type: "confirmation", status: "error" })
      strapi.log.error(
        `[Webhook] ALERT: Failed to send confirmation email to ${order.purchaserEmail}: ${error.message} | order=${order.orderNumber}`
      )

      reportSentryError(strapi, error, {
        tags: { email_type: "confirmation", module: "webhook", severity: "critical" },
        extra: { orderNumber: order.orderNumber, recipientEmail: order.purchaserEmail },
      })
    }
  },

  /**
   * Determine if an error is retryable (Stripe should retry the webhook)
   * Non-retryable errors are logged and prevent endless retry loops
   */
  isRetryableError(error: any): boolean {
    // Database connection errors are retryable
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return true
    }

    // Database deadlock/lock timeout errors are retryable
    if (error.code === "40P01" || error.code === "40001") {
      return true
    }

    // Network errors are retryable
    if (error.message?.includes("network") || error.message?.includes("timeout")) {
      return true
    }

    // Email sending failures are NOT retryable (order is still valid)
    if (error.message?.includes("email") || error.message?.includes("SMTP")) {
      return false
    }

    // Validation errors are NOT retryable (bad data won't fix itself)
    if (error.message?.includes("Invalid") || error.message?.includes("validation")) {
      return false
    }

    // Default to retryable for unknown errors (safer to retry)
    return true
  },
})
