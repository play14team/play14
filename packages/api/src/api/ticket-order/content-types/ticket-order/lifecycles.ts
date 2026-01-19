/**
 * Lifecycle hooks for ticket-order content type
 * Handles email notifications on order events (refunds)
 *
 * Note: Confirmation emails for successful purchases are sent by the Stripe webhook handler
 * in src/api/ticket-order/controllers/webhook.ts
 */

import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import TicketOrderRefundEmail from "../../../../emails/ticket-order-refund"

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
      strapi.log.warn("[TicketOrder] Could not send refund email: order data incomplete")
      return
    }

    const frontendUrl = getFrontendUrl()
    const isPartialRefund = newStatus === "partially_refunded"

    // Build ticket list for email
    const tickets = (order.tickets || []).map((t: any) => ({
      ticketTypeName: t.ticketType?.name || "Ticket",
      ticketCode: t.ticketCode,
    }))

    try {
      const html = await render(
        TicketOrderRefundEmail({
          orderNumber: order.orderNumber,
          eventName: order.event?.name || "Unknown",
          currency: order.currency,
          totalAmount: order.totalAmount,
          refundAmount: order.refundAmount || order.totalAmount,
          refundReason: order.refundReason,
          isPartialRefund,
          tickets,
          frontendUrl,
        })
      )

      const text = await render(
        TicketOrderRefundEmail({
          orderNumber: order.orderNumber,
          eventName: order.event?.name || "Unknown",
          currency: order.currency,
          totalAmount: order.totalAmount,
          refundAmount: order.refundAmount || order.totalAmount,
          refundReason: order.refundReason,
          isPartialRefund,
          tickets,
          frontendUrl,
        }),
        { plainText: true }
      )

      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: order.purchaserEmail,
          subject: `[#play14] Your order has been ${isPartialRefund ? "partially " : ""}refunded`,
          html,
          text,
        })

      strapi.log.info(
        `[TicketOrder] Sent refund notification email to ${order.purchaserEmail} for order ${order.orderNumber}`
      )
    } catch (error) {
      strapi.log.error(`[TicketOrder] Failed to send refund notification email: ${error}`)
    }
  },
}
