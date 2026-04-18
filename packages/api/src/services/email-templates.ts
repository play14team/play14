/**
 * Email template service using React Email
 * Provides helper functions for rendering and sending emails
 */

import { randomBytes } from "node:crypto"
import { join } from "node:path"
import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import PaymentFailedEmail from "../emails/payment-failed"
import PlayerInvitationEmail from "../emails/player-invitation"
import StripeAccountStatusEmail from "../emails/stripe-account-status"
import TicketConfirmationEmail from "../emails/ticket-confirmation"
import TicketSoldNotificationEmail from "../emails/ticket-sold-notification"
import {
  generateEventICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "../libs/calendar"
import { formatTicketItems, generateInvoicePDF, type InvoiceData } from "../libs/invoice"
import { nameToUsername } from "../libs/strings"
import { emailSendDuration, emailSendTotal } from "./observability/metrics"

/**
 * Send order confirmation email with calendar attachment and invoice PDF
 */
export async function sendOrderConfirmationEmail(
  strapi: Core.Strapi,
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
  const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"

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
    strapi.log.warn(`[EmailTemplates] Failed to generate calendar data: ${calError.message}`)
  }

  // Generate invoice PDF (non-critical - email is sent even if PDF fails)
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
      eventLocation,
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

    strapi.log.info(`[EmailTemplates] Invoice PDF generated for order ${order.orderNumber}`)
  } catch (invoiceError: any) {
    // NON-CRITICAL FAILURE: Invoice generation failed but email will still be sent.
    strapi.log.warn(`[EmailTemplates] Failed to generate invoice PDF: ${invoiceError.message}`)
  }

  // Build ticket list for email
  const tickets = createdTickets.map((t) => ({
    ticketTypeName: t.ticketTypeName,
    ticketCode: t.ticketCode,
    attendeeName: t.attendeeName,
  }))

  const emailStartTime = Date.now()

  try {
    const html = await render(
      TicketConfirmationEmail({
        orderNumber: order.orderNumber,
        eventName: order.event.name,
        eventDate,
        eventTime,
        eventLocation,
        currency: order.currency,
        totalAmount: order.totalAmount,
        contactEmail: order.event.contactEmail,
        tickets,
        googleCalendarUrl,
        outlookCalendarUrl,
        frontendUrl,
      })
    )

    const text = await render(
      TicketConfirmationEmail({
        orderNumber: order.orderNumber,
        eventName: order.event.name,
        eventDate,
        eventTime,
        eventLocation,
        currency: order.currency,
        totalAmount: order.totalAmount,
        contactEmail: order.event.contactEmail,
        tickets,
        googleCalendarUrl,
        outlookCalendarUrl,
        frontendUrl,
      }),
      { plainText: true }
    )

    const emailOptions: any = {
      to: order.purchaserEmail,
      subject: `[#play14] Your tickets for ${order.event.name}`,
      html,
      text,
    }

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

    await strapi.plugin("email").service("email").send(emailOptions)

    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "confirmation", status: "success" })
    emailSendDuration.observe({ email_type: "confirmation" }, durationMs / 1000)
    strapi.log.info(
      `[EmailTemplates] Confirmation email sent to ${order.purchaserEmail} | order=${order.orderNumber}, durationMs=${durationMs}`
    )
  } catch (error: any) {
    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "confirmation", status: "error" })
    emailSendDuration.observe({ email_type: "confirmation" }, durationMs / 1000)
    strapi.log.error(
      `[EmailTemplates] ALERT: Failed to send confirmation email to ${order.purchaserEmail}: ${error.message} | email_type=confirmation, severity=critical, order=${order.orderNumber}`
    )
  }
}

/**
 * Notify event organizers when tickets are sold
 */
export async function sendTicketSoldNotificationEmail(
  strapi: Core.Strapi,
  order: any,
  createdTickets: Array<{
    ticketCode: string
    ticketTypeName: string
    attendeeName: string
    attendeeEmail: string
  }>
) {
  const contactEmail = order.event?.contactEmail
  if (!contactEmail) {
    strapi.log.info(
      `[EmailTemplates] Ticket sale notification skipped for order ${order.orderNumber}: missing event contact email`
    )
    return
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
  const tickets = createdTickets.map((ticket) => ({
    ticketTypeName: ticket.ticketTypeName,
    attendeeName: ticket.attendeeName,
    attendeeEmail: ticket.attendeeEmail,
  }))

  const emailStartTime = Date.now()

  try {
    const html = await render(
      TicketSoldNotificationEmail({
        eventName: order.event?.name || "Event",
        eventSlug: order.event?.slug,
        orderNumber: order.orderNumber,
        purchaserName: order.purchaserName,
        purchaserEmail: order.purchaserEmail,
        currency: order.currency,
        totalAmount: order.totalAmount,
        tickets,
        frontendUrl,
      })
    )

    const text = await render(
      TicketSoldNotificationEmail({
        eventName: order.event?.name || "Event",
        eventSlug: order.event?.slug,
        orderNumber: order.orderNumber,
        purchaserName: order.purchaserName,
        purchaserEmail: order.purchaserEmail,
        currency: order.currency,
        totalAmount: order.totalAmount,
        tickets,
        frontendUrl,
      }),
      { plainText: true }
    )

    await strapi
      .plugin("email")
      .service("email")
      .send({
        to: contactEmail,
        subject: `[#play14] New ticket order for ${order.event?.name || "an event"}`,
        html,
        text,
      })

    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "ticket_sold", status: "success" })
    emailSendDuration.observe({ email_type: "ticket_sold" }, durationMs / 1000)
    strapi.log.info(
      `[EmailTemplates] Ticket sale notification sent to ${contactEmail} for order ${order.orderNumber} | durationMs=${durationMs}`
    )
  } catch (error: any) {
    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "ticket_sold", status: "error" })
    emailSendDuration.observe({ email_type: "ticket_sold" }, durationMs / 1000)
    strapi.log.error(
      `[EmailTemplates] Failed to send ticket sale notification for order ${order.orderNumber}: ${error.message}`
    )
  }
}

/**
 * Send invitation email to a newly created player with calendar attachment
 */
export async function sendPlayerInvitationEmail(
  strapi: Core.Strapi,
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
      strapi.log.info(
        `[EmailTemplates] Linked existing user ${email} to player ${player.documentId}`
      )
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
        `[EmailTemplates] Created new user account for ${email} and linked to player ${player.documentId}`
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
    strapi.log.warn(
      `[EmailTemplates] Failed to generate calendar for invitation: ${calError.message}`
    )
  }

  const emailStartTime = Date.now()

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
    if (user) {
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: {
          invitationStatus: "sent",
          invitationSentAt: new Date().toISOString(),
        } as any,
      })
    }

    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "player_invitation", status: "success" })
    emailSendDuration.observe({ email_type: "player_invitation" }, durationMs / 1000)
    strapi.log.info(
      `[EmailTemplates] Player invitation email sent to ${email} | durationMs=${durationMs}`
    )
  } catch (error: any) {
    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "player_invitation", status: "error" })
    emailSendDuration.observe({ email_type: "player_invitation" }, durationMs / 1000)
    strapi.log.error(
      `[EmailTemplates] Failed to send player invitation email to ${email}: ${error.message}`
    )
  }
}

/**
 * Send payment failure notification email using the React Email template.
 */
export async function sendPaymentFailedEmail(
  strapi: Core.Strapi,
  order: any,
  errorMessage: string,
  correlationId?: string
) {
  const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
  const emailStartTime = Date.now()

  try {
    const html = await render(
      PaymentFailedEmail({
        orderNumber: order.orderNumber,
        eventName: order.event?.name || "your order",
        eventSlug: order.event?.slug || "",
        errorMessage,
        frontendUrl,
      })
    )

    const text = await render(
      PaymentFailedEmail({
        orderNumber: order.orderNumber,
        eventName: order.event?.name || "your order",
        eventSlug: order.event?.slug || "",
        errorMessage,
        frontendUrl,
      }),
      { plainText: true }
    )

    await strapi
      .plugin("email")
      .service("email")
      .send({
        to: order.purchaserEmail,
        subject: `[#play14] Payment failed for ${order.event?.name || "your order"}`,
        html,
        text,
      })

    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "payment_failed", status: "success" })
    emailSendDuration.observe({ email_type: "payment_failed" }, durationMs / 1000)
    strapi.log.info(
      `[EmailTemplates] Payment failed email sent to ${order.purchaserEmail} | order=${order.orderNumber}, durationMs=${durationMs}${
        correlationId ? `, correlationId=${correlationId}` : ""
      }`
    )
  } catch (error: any) {
    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "payment_failed", status: "error" })
    emailSendDuration.observe({ email_type: "payment_failed" }, durationMs / 1000)
    strapi.log.error(
      `[EmailTemplates] Failed to send payment failed email: ${error.message} | email_type=payment_failed, order=${order.orderNumber}, to=${order.purchaserEmail}, durationMs=${durationMs}${
        correlationId ? `, correlationId=${correlationId}` : ""
      }`
    )
  }
}

type StripeAccountStatus = "pending" | "active" | "restricted" | "disabled"

const ACCOUNT_STATUS_SUBJECTS: Record<Exclude<StripeAccountStatus, "pending">, string> = {
  active: "Your Stripe account is ready to accept payments",
  restricted: "Additional info needed on your Stripe account",
  disabled: "Your Stripe account has been disabled",
}

/**
 * Notify a host when their connected Stripe account transitions between
 * statuses. Transitions landing on `pending` do not trigger an email.
 */
export async function sendStripeAccountStatusEmail(
  strapi: Core.Strapi,
  stripeAccount: any,
  previousStatus: StripeAccountStatus,
  currentStatus: StripeAccountStatus
) {
  if (currentStatus === "pending") {
    strapi.log.info(
      `[EmailTemplates] Skipping Stripe account status email: current status is pending | account=${stripeAccount?.stripeAccountId}`
    )
    return
  }

  if (previousStatus === currentStatus) {
    return
  }

  // Resolve the host's email via stripeAccount.player -> user.email.
  // We re-fetch to ensure the nested relations are populated, since the
  // caller may only have the base stripe-account record. Wrapped in a
  // try/catch so email delivery is strictly best-effort and never breaks
  // webhook processing.
  let account: any = null
  try {
    const docs: any = strapi.documents("api::stripe-account.stripe-account")
    if (typeof docs.findOne === "function") {
      account = await docs.findOne({
        documentId: stripeAccount.documentId,
        populate: {
          player: {
            fields: ["name"],
            populate: {
              user: { fields: ["email", "firstname", "lastname"] },
            },
          },
        },
      })
    }
  } catch (lookupError: any) {
    strapi.log.warn(
      `[EmailTemplates] Failed to resolve host for Stripe account status email: ${lookupError.message} | account=${stripeAccount?.stripeAccountId}`
    )
    return
  }

  const player = account?.player
  const user = player?.user
  const hostEmail = user?.email

  if (!hostEmail) {
    strapi.log.warn(
      `[EmailTemplates] Cannot send Stripe account status email: missing host email link | account=${stripeAccount?.stripeAccountId}, hasPlayer=${Boolean(player)}, hasUser=${Boolean(user)}`
    )
    return
  }

  const hostName =
    (player?.name as string) ||
    [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim() ||
    "there"

  const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
  const subject = `[#play14] ${ACCOUNT_STATUS_SUBJECTS[currentStatus as Exclude<StripeAccountStatus, "pending">]}`

  const emailStartTime = Date.now()

  try {
    const html = await render(
      StripeAccountStatusEmail({
        hostName,
        previousStatus,
        currentStatus,
        frontendUrl,
        chargesEnabled: Boolean(stripeAccount.chargesEnabled),
        payoutsEnabled: Boolean(stripeAccount.payoutsEnabled),
        detailsSubmitted: Boolean(stripeAccount.detailsSubmitted),
      })
    )

    const text = await render(
      StripeAccountStatusEmail({
        hostName,
        previousStatus,
        currentStatus,
        frontendUrl,
        chargesEnabled: Boolean(stripeAccount.chargesEnabled),
        payoutsEnabled: Boolean(stripeAccount.payoutsEnabled),
        detailsSubmitted: Boolean(stripeAccount.detailsSubmitted),
      }),
      { plainText: true }
    )

    await strapi.plugin("email").service("email").send({
      to: hostEmail,
      subject,
      html,
      text,
    })

    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "stripe_account_status", status: "success" })
    emailSendDuration.observe({ email_type: "stripe_account_status" }, durationMs / 1000)
    strapi.log.info(
      `[EmailTemplates] Stripe account status email sent to ${hostEmail} | account=${stripeAccount.stripeAccountId}, previousStatus=${previousStatus}, currentStatus=${currentStatus}, durationMs=${durationMs}`
    )
  } catch (error: any) {
    const durationMs = Date.now() - emailStartTime
    emailSendTotal.inc({ email_type: "stripe_account_status", status: "error" })
    emailSendDuration.observe({ email_type: "stripe_account_status" }, durationMs / 1000)
    strapi.log.error(
      `[EmailTemplates] Failed to send Stripe account status email to ${hostEmail}: ${error.message} | account=${stripeAccount?.stripeAccountId}`
    )
  }
}
