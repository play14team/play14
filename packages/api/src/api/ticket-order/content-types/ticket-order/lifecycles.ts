/**
 * Lifecycle hooks for ticket-order content type
 * Handles email notifications on order events (refunds)
 *
 * Note: Confirmation emails for successful purchases are sent by the Stripe webhook handler
 * in src/api/ticket-order/controllers/webhook.ts
 */

import type { Core } from "@strapi/strapi"

const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || "https://play14.org"
}

export default {
  /**
   * Send refund notification email when order status changes to refunded
   */
  async afterUpdate(event: { result: any; params: any }) {
    const { result } = event

    // Get strapi instance
    const strapi = (global as any).strapi as Core.Strapi

    // Only send email when status changes to refunded
    const newStatus = result.status
    if (newStatus !== "refunded" && newStatus !== "partially_refunded") {
      return
    }

    // Populate the order with event and player data
    const order = await strapi.documents("api::ticket-order.ticket-order").findOne({
      documentId: result.documentId,
      populate: {
        event: {
          fields: ["documentId", "name", "slug"],
        },
        player: {
          fields: ["documentId", "name"],
        },
        tickets: {
          populate: {
            ticketType: {
              fields: ["name"],
            },
          },
        },
      },
    })

    if (!order || !order.purchaserEmail) {
      strapi.log.warn(`[TicketOrder] Could not send refund email: order data incomplete`)
      return
    }

    const frontendUrl = getFrontendUrl()
    const isPartialRefund = newStatus === "partially_refunded"
    const refundType = isPartialRefund ? "partial" : "full"

    // Build ticket list for email
    const ticketList = (order.tickets || [])
      .map((t: any) => `- ${t.ticketType?.name || "Ticket"}: ${t.ticketCode}`)
      .join("\n")

    const ticketListHtml = (order.tickets || [])
      .map(
        (t: any) =>
          `<li><strong>${t.ticketType?.name || "Ticket"}</strong>: <code>${t.ticketCode}</code></li>`
      )
      .join("")

    try {
      await strapi.plugin("email").service("email").send({
        to: order.purchaserEmail,
        subject: `[#play14] Your order has been ${isPartialRefund ? "partially " : ""}refunded`,
        text: `
Your order has been ${refundType}ly refunded.

Order: ${order.orderNumber}
Event: ${order.event?.name || "Unknown"}
Original Amount: ${order.currency} ${order.totalAmount}
Refunded Amount: ${order.currency} ${order.refundAmount || order.totalAmount}
${order.refundReason ? `Reason: ${order.refundReason}` : ""}

Affected tickets:
${ticketList}

${isPartialRefund ? "Some of your tickets may still be valid." : "Your tickets have been cancelled and are no longer valid for entry."}

If you have any questions, please contact the event organizers.

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
    .refund-notice { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .btn { display: inline-block; background: #f47920; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>#play14</h1>
    </div>
    <div class="content">
      <h2>Your order has been ${isPartialRefund ? "partially " : ""}refunded</h2>

      <div class="refund-notice">
        <p><strong>Order:</strong> ${order.orderNumber}</p>
        <p><strong>Event:</strong> ${order.event?.name || "Unknown"}</p>
        <p><strong>Original Amount:</strong> ${order.currency} ${order.totalAmount}</p>
        <p><strong>Refunded Amount:</strong> ${order.currency} ${order.refundAmount || order.totalAmount}</p>
        ${order.refundReason ? `<p><strong>Reason:</strong> ${order.refundReason}</p>` : ""}
      </div>

      <div class="tickets">
        <h3>Affected Tickets</h3>
        <ul>
          ${ticketListHtml || "<li>No tickets found</li>"}
        </ul>
      </div>

      <p>${isPartialRefund ? "Some of your tickets may still be valid. Please check your account for details." : "Your tickets have been cancelled and are no longer valid for entry."}</p>

      <a href="${frontendUrl}/admin/my-tickets" class="btn">View Your Tickets</a>
    </div>
    <div class="footer">
      <p>If you have any questions, please contact the event organizers.</p>
      <p>The #play14 Team</p>
    </div>
  </div>
</body>
</html>
        `.trim(),
      })

      strapi.log.info(`[TicketOrder] Sent refund notification email to ${order.purchaserEmail} for order ${order.orderNumber}`)
    } catch (error) {
      strapi.log.error(`[TicketOrder] Failed to send refund notification email: ${error}`)
    }
  },
}
