/**
 * Email template service using React Email
 * Provides helper functions for rendering and sending emails
 */

import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import { randomBytes } from "node:crypto"
import {
  generateEventICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "../libs/calendar"
import { nameToUsername } from "../libs/strings"
import TicketConfirmationEmail from "../emails/ticket-confirmation"
import PlayerInvitationEmail from "../emails/player-invitation"

/**
 * Send order confirmation email with calendar attachment
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

  // Build ticket list for email
  const tickets = createdTickets.map((t) => ({
    ticketTypeName: t.ticketTypeName,
    ticketCode: t.ticketCode,
    attendeeName: t.attendeeName,
  }))

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

    strapi.log.info(`[EmailTemplates] Confirmation email sent to ${order.purchaserEmail}`)
  } catch (error: any) {
    strapi.log.error(
      `[EmailTemplates] ALERT: Failed to send confirmation email to ${order.purchaserEmail}: ${error.message}`
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
      strapi.log.info(`[EmailTemplates] Linked existing user ${email} to player ${player.documentId}`)
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
      strapi.log.info(`[EmailTemplates] Created new user account for ${email} and linked to player ${player.documentId}`)
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
    strapi.log.warn(`[EmailTemplates] Failed to generate calendar for invitation: ${calError.message}`)
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

    strapi.log.info(`[EmailTemplates] Player invitation email sent to ${email}`)
  } catch (error: any) {
    strapi.log.error(`[EmailTemplates] Failed to send player invitation email to ${email}: ${error.message}`)
  }
}
