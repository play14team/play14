/**
 * Webhook controller for handling Stripe payment events
 */

import type { Core } from "@strapi/strapi"
import slugify from "slugify"
import {
  generateEventICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "../../../libs/calendar"
import { generateTicketCode } from "../../../libs/tickets"
import { getPaymentProvider } from "../../../services/payment"
import { confirmReservations, releaseReservations } from "../../../services/ticketing"

interface AttendeeInfo {
  firstName: string
  lastName: string
  email: string
  tshirtSize?: string
  foodPreferences?: string
  photoConsent: boolean
  photoConsentTimestamp?: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(ctx) {
    const signature = ctx.request.headers["stripe-signature"]

    if (!signature) {
      strapi.log.warn("[Webhook] Missing Stripe signature header")
      return ctx.badRequest("Missing signature")
    }

    // Get raw body for signature verification (requires includeUnparsed: true in body middleware)
    // SECURITY: We must use the raw unparsed body for signature verification.
    // Using JSON.stringify on parsed body would produce a different signature and could allow bypass.
    const unparsedBody = ctx.request.body[Symbol.for("unparsedBody")]

    if (!unparsedBody || typeof unparsedBody !== "string") {
      strapi.log.error(
        "[Webhook] Raw body not available for signature verification - check body middleware config (includeUnparsed: true)"
      )
      return ctx.badRequest("Webhook signature verification failed: raw body unavailable")
    }

    const payload = unparsedBody

    try {
      const provider = getPaymentProvider("stripe")
      const event = await provider.verifyWebhookSignature(payload, signature)

      strapi.log.info(`[Webhook] Received Stripe event: ${event.type}`)

      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data)
          break

        case "checkout.session.expired":
          await this.handleCheckoutExpired(event.data)
          break

        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(event.data)
          break

        case "charge.refunded":
          await this.handleChargeRefunded(event.data)
          break

        case "account.updated":
          await this.handleAccountUpdated(event.data)
          break

        default:
          strapi.log.info(`[Webhook] Unhandled event type: ${event.type}`)
      }

      return ctx.send({ received: true })
    } catch (error: any) {
      strapi.log.error(`[Webhook] Error processing webhook: ${error.message}`)
      return ctx.badRequest("Webhook verification failed")
    }
  },

  /**
   * Handle successful checkout session
   */
  async handleCheckoutCompleted(sessionData: Record<string, unknown>) {
    const sessionId = sessionData.id as string
    const paymentIntent = sessionData.payment_intent as string
    const metadata = sessionData.metadata as Record<string, string>

    if (!sessionId) {
      strapi.log.warn("[Webhook] Missing session ID in checkout.session.completed")
      return
    }

    // Find the order by session ID
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerSessionId: sessionId },
      populate: {
        event: {
          fields: ["id", "documentId", "name", "slug", "start", "end", "contactEmail", "description", "eventStatus"],
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
      strapi.log.warn(`[Webhook] Order not found for session: ${sessionId}`)
      return
    }

    if (order.status !== "pending") {
      strapi.log.info(`[Webhook] Order ${order.orderNumber} already processed (status: ${order.status})`)
      return
    }

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

          // Find or create player for this attendee
          const playerResult = await this.findOrCreatePlayerForAttendee(
            attendee,
            order.player,
            order.event
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

    // Update order status
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: order.documentId,
      data: {
        status: "paid",
        providerOrderId: paymentIntent,
        paidAt: new Date().toISOString(),
      } as any,
    })

    // Increment discount code usage count if applicable
    if (order.discountCode) {
      await strapi.documents("api::discount-code.discount-code").update({
        documentId: (order.discountCode as any).documentId,
        data: {
          usedCount: ((order.discountCode as any).usedCount || 0) + 1,
        } as any,
      })
      strapi.log.info(`[Webhook] Discount code ${(order.discountCode as any).code} usage incremented`)
    }

    // Add all ticket players to event attendees
    const playersToAddToEvent = new Set<string>()
    for (const ticket of createdTickets) {
      if (ticket.player?.documentId) {
        playersToAddToEvent.add(ticket.player.documentId)
      }
    }

    for (const playerDocId of playersToAddToEvent) {
      await this.addPlayerToEventAttendees(playerDocId, order.event)
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

    strapi.log.info(`[Webhook] Order ${order.orderNumber} completed successfully with ${createdTickets.length} tickets`)
  },

  /**
   * Find or create a player profile for an attendee
   */
  async findOrCreatePlayerForAttendee(
    attendee: AttendeeInfo,
    purchaserPlayer: any,
    event: any
  ): Promise<{ player: any; isNew: boolean }> {
    // Validate attendee data
    if (!attendee.firstName || !attendee.lastName) {
      throw new Error("Attendee first name and last name are required")
    }

    if (!attendee.email) {
      throw new Error("Attendee email is required")
    }

    // Sanitize and validate name (2-100 chars, no special control characters)
    const firstName = attendee.firstName.trim().slice(0, 50)
    const lastName = attendee.lastName.trim().slice(0, 50)

    if (firstName.length < 1 || lastName.length < 1) {
      throw new Error("Attendee first name and last name cannot be empty")
    }

    // Check for invalid characters (control characters)
    const invalidCharPattern = /[\x00-\x1F\x7F]/
    if (invalidCharPattern.test(firstName) || invalidCharPattern.test(lastName)) {
      throw new Error("Attendee name contains invalid characters")
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(attendee.email)) {
      throw new Error(`Invalid attendee email format: ${attendee.email}`)
    }

    const attendeeName = `${firstName} ${lastName}`
    const attendeeEmail = attendee.email.toLowerCase().trim()

    // 1. If attendee email matches purchaser's player, use their player
    if (purchaserPlayer) {
      // Find the user linked to purchaser player to get their email
      const purchaserPlayerDoc = await strapi.documents("api::player.player").findOne({
        documentId: purchaserPlayer.documentId,
        populate: { user: { fields: ["email"] } },
      })

      if (purchaserPlayerDoc?.user?.email?.toLowerCase() === attendeeEmail) {
        strapi.log.info(`[Webhook] Attendee ${attendeeName} matched to purchaser player`)
        return { player: purchaserPlayer, isNew: false }
      }
    }

    // 2. Look for a user with this email and get their player
    const existingUser = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { email: { $eqi: attendeeEmail } },
      populate: { player: true },
    })

    if (existingUser?.player) {
      strapi.log.info(`[Webhook] Found existing player via user email: ${attendeeName}`)

      // Update player's default preferences if they don't have them set
      if (attendee.tshirtSize || attendee.foodPreferences) {
        const playerDoc = await strapi.documents("api::player.player").findOne({
          documentId: existingUser.player.documentId,
        })

        if (playerDoc) {
          const updateData: any = {}
          if (attendee.tshirtSize && !playerDoc.defaultTshirtSize) {
            updateData.defaultTshirtSize = attendee.tshirtSize
          }
          if (attendee.foodPreferences && !playerDoc.defaultFoodPreferences) {
            updateData.defaultFoodPreferences = attendee.foodPreferences
          }
          if (Object.keys(updateData).length > 0) {
            await strapi.documents("api::player.player").update({
              documentId: existingUser.player.documentId,
              data: updateData,
            })
          }
        }
      }

      return { player: existingUser.player, isNew: false }
    }

    // 3. Look for an existing player by exact name match
    const existingPlayerByName = await strapi.documents("api::player.player").findFirst({
      filters: {
        name: { $eqi: attendeeName },
      },
      populate: { user: true },
    })

    if (existingPlayerByName) {
      // Player exists - use them regardless of whether they're linked to a user
      // (Player names are unique, so we can't create a new one with the same name)
      strapi.log.info(`[Webhook] Found existing player by name: ${attendeeName} (linked: ${!!existingPlayerByName.user})`)

      // Update player's default preferences if they don't have them set
      const updateData: any = {}
      if (attendee.tshirtSize && !existingPlayerByName.defaultTshirtSize) {
        updateData.defaultTshirtSize = attendee.tshirtSize
      }
      if (attendee.foodPreferences && !existingPlayerByName.defaultFoodPreferences) {
        updateData.defaultFoodPreferences = attendee.foodPreferences
      }
      if (Object.keys(updateData).length > 0) {
        await strapi.documents("api::player.player").update({
          documentId: existingPlayerByName.documentId,
          data: updateData,
        })
      }

      return { player: existingPlayerByName, isNew: false }
    }

    // 4. Create a new player profile (unlinked to any user)
    const baseSlug = slugify(attendeeName, { lower: true, strict: true })

    // Ensure unique slug with retry loop (more robust than single random suffix)
    let slug = baseSlug
    let slugAttempts = 0
    const maxSlugAttempts = 10

    while (slugAttempts < maxSlugAttempts) {
      const existingSlug = await strapi.documents("api::player.player").findFirst({
        filters: { slug },
      })

      if (!existingSlug) {
        break // Slug is unique
      }

      // Generate a more unique suffix using timestamp + random
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 6)
      slug = `${baseSlug}-${timestamp.slice(-4)}${random}`
      slugAttempts++
    }

    if (slugAttempts >= maxSlugAttempts) {
      throw new Error(`Failed to generate unique slug for player: ${attendeeName}`)
    }

    const newPlayer = await strapi.documents("api::player.player").create({
      data: {
        name: attendeeName,
        slug,
        position: "Player",
        defaultTshirtSize: attendee.tshirtSize || "none",
        defaultFoodPreferences: attendee.foodPreferences || null,
      } as any,
    })

    strapi.log.info(`[Webhook] Created new player profile for attendee: ${attendeeName} (${newPlayer.documentId})`)

    return { player: newPlayer, isNew: true }
  },

  /**
   * Add a player to an event's attendees list
   */
  async addPlayerToEventAttendees(playerDocumentId: string, event: any) {
    const playerDoc = await strapi.documents("api::player.player").findOne({
      documentId: playerDocumentId,
      populate: { attended: { fields: ["id", "documentId"] } },
    })

    if (!playerDoc) return

    const currentAttendedIds = playerDoc.attended?.map((e: any) => e.id) || []
    const alreadyAttending = playerDoc.attended?.some(
      (e: any) => e.documentId === event.documentId
    )

    if (!alreadyAttending) {
      await strapi.documents("api::player.player").update({
        documentId: playerDocumentId,
        data: {
          attended: [...currentAttendedIds, event.id],
        } as any,
      })

      strapi.log.info(
        `[Webhook] Player ${playerDocumentId} added to event ${event.documentId} attendees`
      )
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
    const logoUrl = "https://play14.org/logo/play14_600x200_transparent-dark.png"

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

    // Claim URL with player document ID
    const claimUrl = `${frontendUrl}/auth/register?claim=${player.documentId}`

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

    // Calendar section HTML
    const calendarSectionHtml = `
      <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h3 style="margin-top: 0; color: #1976d2;">Add to Your Calendar</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${googleCalendarUrl ? `<a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background: #4285f4; color: #ffffff !important; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 13px;">Google Calendar</a>` : ""}
          ${outlookCalendarUrl ? `<a href="${outlookCalendarUrl}" target="_blank" style="display: inline-block; background: #0078d4; color: #ffffff !important; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-size: 13px;">Outlook</a>` : ""}
        </div>
        <p style="margin-top: 12px; margin-bottom: 0; font-size: 12px; color: #666;">
          An .ics calendar file is also attached to this email.
        </p>
      </div>
    `

    try {
      const emailOptions: any = {
        to: email,
        subject: `[#play14] Your ticket for ${event.name} - Create your profile`,
        text: `
Hi ${playerName.split(" ")[0]},

You've been registered for ${event.name}!

Your ticket: ${ticketCode}
Event: ${event.name}
Date: ${eventDate} at ${eventTime}
Location: ${eventLocation}

Add to your calendar:
- Google Calendar: ${googleCalendarUrl}
- Outlook: ${outlookCalendarUrl}

Create your #play14 account to:
- Manage your profile
- View your tickets
- Connect with the community

Create your account: ${claimUrl}

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
    .ticket-info { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .ticket-code { font-size: 24px; font-weight: bold; color: #f47920; letter-spacing: 2px; }
    .footer { text-align: center; padding: 20px; background: #f5f5f5; color: #666; font-size: 12px; }
    .btn { display: inline-block; background: #f47920; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    h2 { color: #333; margin-top: 0; }
    .features { margin: 20px 0; padding-left: 20px; }
    .features li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="#play14" />
    </div>
    <div class="content">
      <h2>Welcome to #play14!</h2>
      <p>Hi ${playerName.split(" ")[0]},</p>
      <p>You've been registered for <strong>${event.name}</strong>!</p>

      <div class="ticket-info">
        <p><strong>Your Ticket</strong></p>
        <p class="ticket-code">${ticketCode}</p>
        <p style="margin-top: 15px; margin-bottom: 0;">
          <strong>Event:</strong> ${event.name}<br/>
          <strong>Date:</strong> ${eventDate} at ${eventTime}<br/>
          <strong>Location:</strong> ${eventLocation}
        </p>
      </div>

      ${calendarSectionHtml}

      <p>Create your #play14 account to:</p>
      <ul class="features">
        <li>Manage your player profile</li>
        <li>View all your tickets</li>
        <li>Connect with the community</li>
        <li>Get updates about events</li>
      </ul>

      <a href="${claimUrl}" class="btn">Create Your Account</a>

      <p style="margin-top: 30px;">See you at the event!</p>
    </div>
    <div class="footer">
      <p>The #play14 Team</p>
      <p><a href="${frontendUrl}" style="color: #f47920;">play14.org</a></p>
    </div>
  </div>
</body>
</html>
        `.trim(),
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

      strapi.log.info(`[Webhook] Player invitation email sent to ${email}`)
    } catch (error: any) {
      // NON-CRITICAL FAILURE: Email sending failed but order is still valid.
      // The ticket was created successfully; user just won't receive their invitation email.
      // TODO: Integrate with monitoring/alerting system for:
      // 1. Immediate notification to support team
      // 2. Retry mechanism for failed emails
      // 3. Dashboard to track email delivery rates
      strapi.log.error(`[Webhook] Failed to send player invitation email to ${email}: ${error.message}`)
    }
  },

  /**
   * Handle expired checkout session (user abandoned checkout)
   */
  async handleCheckoutExpired(sessionData: Record<string, unknown>) {
    const sessionId = sessionData.id as string

    if (!sessionId) {
      strapi.log.warn("[Webhook] Missing session ID in checkout.session.expired")
      return
    }

    // Find the order by session ID
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerSessionId: sessionId },
      populate: {
        event: { fields: ["id", "documentId", "name"] },
      },
    })

    if (!order) {
      strapi.log.info(`[Webhook] No order found for expired session: ${sessionId}`)
      return
    }

    if (order.status !== "pending") {
      strapi.log.info(`[Webhook] Order ${order.orderNumber} not pending (status: ${order.status}), skipping expiration`)
      return
    }

    // Release any ticket reservations before marking expired
    await releaseReservations(strapi, order.documentId)

    // Update order status to expired
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: order.documentId,
      data: {
        status: "expired",
      } as any,
    })

    strapi.log.info(`[Webhook] Order ${order.orderNumber} marked as expired (checkout abandoned)`)
  },

  /**
   * Handle failed payment intent
   */
  async handlePaymentFailed(paymentIntentData: Record<string, unknown>) {
    const paymentIntentId = paymentIntentData.id as string
    const lastPaymentError = paymentIntentData.last_payment_error as Record<string, unknown> | null
    const errorMessage = lastPaymentError?.message as string || "Payment failed"
    const errorCode = lastPaymentError?.code as string || "unknown"

    if (!paymentIntentId) {
      strapi.log.warn("[Webhook] Missing payment intent ID in payment_intent.payment_failed")
      return
    }

    // Find the order by payment intent (stored in providerOrderId after checkout completion)
    // Note: For failed payments during checkout, the order might still have the session ID
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: {
        $or: [
          { providerOrderId: paymentIntentId },
          { providerSessionId: { $contains: paymentIntentId } },
        ],
      },
      populate: {
        event: { fields: ["id", "documentId", "name", "slug"] },
      },
    })

    if (!order) {
      strapi.log.info(`[Webhook] No order found for failed payment intent: ${paymentIntentId}`)
      return
    }

    // Log the failure details
    strapi.log.warn(
      `[Webhook] Payment failed for order ${order.orderNumber}: ${errorCode} - ${errorMessage}`
    )

    // Update order with failure info if still pending
    if (order.status === "pending") {
      // Release any ticket reservations before marking failed
      await releaseReservations(strapi, order.documentId)

      await strapi.documents("api::ticket-order.ticket-order").update({
        documentId: order.documentId,
        data: {
          status: "failed",
          notes: `Payment failed: ${errorCode} - ${errorMessage}`,
        } as any,
      })

      strapi.log.info(`[Webhook] Order ${order.orderNumber} marked as failed`)

      // Optionally send failure notification email
      await this.sendPaymentFailedEmail(order, errorMessage)
    }
  },

  /**
   * Send payment failure notification email
   */
  async sendPaymentFailedEmail(order: any, errorMessage: string) {
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"

    try {
      await strapi.plugin("email").service("email").send({
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
      <img src="https://play14.org/logo/play14_600x200_transparent-dark.png" alt="#play14" />
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

      strapi.log.info(`[Webhook] Payment failed email sent to ${order.purchaserEmail}`)
    } catch (error: any) {
      strapi.log.error(`[Webhook] Failed to send payment failed email: ${error.message}`)
    }
  },

  /**
   * Handle charge refund (initiated from Stripe dashboard)
   */
  async handleChargeRefunded(chargeData: Record<string, unknown>) {
    const paymentIntent = chargeData.payment_intent as string
    const amountRefunded = (chargeData.amount_refunded as number) / 100

    if (!paymentIntent) {
      strapi.log.warn("[Webhook] Missing payment_intent in charge.refunded")
      return
    }

    // Find the order by payment intent
    const order = await strapi.documents("api::ticket-order.ticket-order").findFirst({
      filters: { providerOrderId: paymentIntent },
      populate: {
        tickets: true,
        player: true,
        event: true,
      },
    })

    if (!order) {
      strapi.log.warn(`[Webhook] Order not found for payment intent: ${paymentIntent}`)
      return
    }

    if (order.status === "refunded") {
      strapi.log.info(`[Webhook] Order ${order.orderNumber} already refunded`)
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

    // Update all tickets to refunded
    for (const ticket of order.tickets || []) {
      await strapi.documents("api::ticket.ticket").update({
        documentId: ticket.documentId,
        data: { ticketStatus: "refunded" } as any,
      })
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

    strapi.log.info(`[Webhook] Order ${order.orderNumber} refunded via Stripe dashboard`)
  },

  /**
   * Handle Stripe Connect account updates
   */
  async handleAccountUpdated(accountData: Record<string, unknown>) {
    const stripeAccountId = accountData.id as string
    const chargesEnabled = accountData.charges_enabled as boolean
    const payoutsEnabled = accountData.payouts_enabled as boolean
    const detailsSubmitted = accountData.details_submitted as boolean

    if (!stripeAccountId) {
      strapi.log.warn("[Webhook] Missing account ID in account.updated")
      return
    }

    // Find the stripe account in our database
    const stripeAccount = await strapi.documents("api::stripe-account.stripe-account").findFirst({
      filters: { stripeAccountId },
    })

    if (!stripeAccount) {
      strapi.log.warn(`[Webhook] Stripe account not found: ${stripeAccountId}`)
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
      `[Webhook] Stripe account ${stripeAccountId} updated - status: ${accountStatus}, charges: ${chargesEnabled}, payouts: ${payoutsEnabled}`
    )
  },

  /**
   * Send order confirmation email with calendar attachment
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
    // Logo URL must be publicly accessible for email clients (dark variant for dark header background)
    const logoUrl = "https://play14.org/logo/play14_600x200_transparent-dark.png"

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

      // Add ICS attachment if generated successfully
      if (icsContent) {
        emailOptions.attachments = [
          {
            filename: `${order.event.slug || "play14-event"}.ics`,
            content: Buffer.from(icsContent),
            contentType: "text/calendar",
          },
        ]
      }

      await strapi.plugin("email").service("email").send(emailOptions)

      strapi.log.info(`[Webhook] Confirmation email sent to ${order.purchaserEmail}`)
    } catch (error: any) {
      // NON-CRITICAL FAILURE: Email sending failed but order is still valid and tickets created.
      // This is a serious issue as the customer paid but won't receive confirmation.
      // TODO: Integrate with monitoring/alerting system for:
      // 1. Immediate notification to support team to manually resend
      // 2. Retry mechanism for failed emails
      // 3. Store failed email attempts for later retry
      strapi.log.error(`[Webhook] ALERT: Failed to send confirmation email to ${order.purchaserEmail}: ${error.message}`)
    }
  },
})
