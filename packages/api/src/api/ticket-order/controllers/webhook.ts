/**
 * Webhook controller for handling Stripe payment events
 */

import type { Core } from "@strapi/strapi"
import { generateTicketCode } from "../../../libs/tickets"
import { getPaymentProvider } from "../../../services/payment"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(ctx) {
    const signature = ctx.request.headers["stripe-signature"]
    const rawBody = ctx.request.body

    if (!signature) {
      strapi.log.warn("[Webhook] Missing Stripe signature header")
      return ctx.badRequest("Missing signature")
    }

    // Get raw body as string for signature verification
    let payload: string
    if (typeof rawBody === "string") {
      payload = rawBody
    } else if (Buffer.isBuffer(rawBody)) {
      payload = rawBody.toString("utf8")
    } else {
      payload = JSON.stringify(rawBody)
    }

    try {
      const provider = getPaymentProvider("stripe")
      const event = await provider.verifyWebhookSignature(payload, signature)

      strapi.log.info(`[Webhook] Received Stripe event: ${event.type}`)

      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data)
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
          populate: {
            ticketTypes: true,
          },
        },
        player: true,
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

    // Create tickets for each ticket type in the order
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
        await strapi.documents("api::ticket.ticket").create({
          data: {
            ticketCode: generateTicketCode(),
            status: "valid",
            attendeeName: order.purchaserName,
            attendeeEmail: order.purchaserEmail,
            ticketType: ticketType.id,
            order: order.id,
            player: order.player?.id || null,
            event: order.event.id,
          } as any,
        })
      }

      // Update sold count on ticket type
      await strapi.documents("api::ticket-type.ticket-type").update({
        documentId: ticketType.documentId,
        data: {
          soldCount: (ticketType.soldCount || 0) + detail.quantity,
        } as any,
      })
    }

    // Update order status
    await strapi.documents("api::ticket-order.ticket-order").update({
      documentId: order.documentId,
      data: {
        status: "paid",
        providerOrderId: paymentIntent,
        paidAt: new Date().toISOString(),
      } as any,
    })

    // Add player to event attendees (auto-attendance)
    if (order.player) {
      const playerDoc = await strapi.documents("api::player.player").findOne({
        documentId: order.player.documentId,
        populate: { attended: { fields: ["id", "documentId"] } },
      })

      if (playerDoc) {
        const currentAttendedIds = playerDoc.attended?.map((e: any) => e.id) || []
        const alreadyAttending = playerDoc.attended?.some(
          (e: any) => e.documentId === order.event.documentId
        )

        if (!alreadyAttending) {
          await strapi.documents("api::player.player").update({
            documentId: order.player.documentId,
            data: {
              attended: [...currentAttendedIds, order.event.id],
            } as any,
          })

          strapi.log.info(
            `[Webhook] Player ${order.player.documentId} added to event ${order.event.documentId} attendees`
          )
        }
      }
    }

    // Send confirmation email
    await this.sendConfirmationEmail(order)

    strapi.log.info(`[Webhook] Order ${order.orderNumber} completed successfully`)
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
        data: { status: "refunded" } as any,
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
   * Send order confirmation email
   */
  async sendConfirmationEmail(order: any) {
    const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"

    // Fetch tickets for the order
    const tickets = await strapi.documents("api::ticket.ticket").findMany({
      filters: { order: { id: order.id } },
      populate: {
        ticketType: { fields: ["name"] },
      },
    })

    const ticketList = tickets
      .map((t: any) => `- ${t.ticketType?.name || "Ticket"}: ${t.ticketCode}`)
      .join("\n")

    const ticketListHtml = tickets
      .map(
        (t: any) =>
          `<li><strong>${t.ticketType?.name || "Ticket"}</strong>: <code>${t.ticketCode}</code></li>`
      )
      .join("")

    try {
      await strapi.plugin("email").service("email").send({
        to: order.purchaserEmail,
        subject: `[#play14] Your tickets for ${order.event.name}`,
        text: `
Thank you for your purchase!

Order: ${order.orderNumber}
Event: ${order.event.name}
Amount: ${order.currency} ${order.totalAmount}

Your tickets:
${ticketList}

View your tickets: ${frontendUrl}/account/tickets

See you at the event!

The #play14 Team
        `.trim(),
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f47920; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .tickets { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    code { background: #eee; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .btn { display: inline-block; background: #f47920; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>#play14</h1>
    </div>
    <div class="content">
      <h2>Thank you for your purchase!</h2>
      <p><strong>Order:</strong> ${order.orderNumber}</p>
      <p><strong>Event:</strong> ${order.event.name}</p>
      <p><strong>Amount:</strong> ${order.currency} ${order.totalAmount}</p>

      <div class="tickets">
        <h3>Your Tickets</h3>
        <ul>
          ${ticketListHtml}
        </ul>
      </div>

      <p>Keep these ticket codes safe - you'll need them for check-in at the event.</p>

      <a href="${frontendUrl}/account/tickets" class="btn">View Your Tickets</a>
    </div>
    <div class="footer">
      <p>See you at the event!</p>
      <p>The #play14 Team</p>
    </div>
  </div>
</body>
</html>
        `.trim(),
      })

      strapi.log.info(`[Webhook] Confirmation email sent to ${order.purchaserEmail}`)
    } catch (error: any) {
      strapi.log.error(`[Webhook] Failed to send confirmation email: ${error.message}`)
    }
  },
})
