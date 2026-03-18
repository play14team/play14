import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getOrderStatus } from "@/components/tickets/purchase.action"
import { requireAuth } from "@/libs/auth"
import DownloadInvoiceButton from "./download-invoice-button"
import styles from "./page.module.scss"
import RefundButton from "./refund-button"

interface OrderPageProps {
  params: Promise<{ orderId: string }>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
    case "valid":
    case "used":
      return styles.statusPaid
    case "pending":
      return styles.statusPending
    case "refunded":
      return styles.statusRefunded
    case "cancelled":
      return styles.statusCancelled
    default:
      return ""
  }
}

export default async function OrderPage({ params }: OrderPageProps) {
  await requireAuth()
  const t = await getTranslations("orders")
  const resolvedParams = await params
  const order = await getOrderStatus(resolvedParams.orderId)

  if (!order) {
    notFound()
  }

  const canRefund = order.status === "paid" && !order.refundedAt
  const canDownloadInvoice = order.status === "paid" || order.status === "refunded"

  return (
    <div className={styles.container}>
      <div className={styles.orderCard}>
        <div className={styles.header}>
          <div>
            <h1>{t("orderDetails")}</h1>
            <p className={styles.orderNumber}>
              {t("orderHash", { orderNumber: order.orderNumber })}
            </p>
          </div>
          <span className={`${styles.status} ${getStatusBadgeClass(order.status)}`}>
            {order.status.toUpperCase()}
          </span>
        </div>

        {/* Event Information */}
        {order.event && (
          <div className={styles.section}>
            <h2>{t("event")}</h2>
            <Link href={`/events/${order.event.slug}`} className={styles.eventName}>
              {order.event.name}
            </Link>
            <div className={styles.eventDate}>
              {formatDate(order.event.start)} - {formatDate(order.event.end)}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className={styles.section}>
          <h2>{t("orderSummary")}</h2>
          <div className={styles.orderSummary}>
            <div className={styles.summaryRow}>
              <span className={styles.label}>{t("purchaser")}</span>
              <span>{order.purchaserName}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.label}>{t("email")}</span>
              <span>{order.purchaserEmail}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.label}>{t("totalAmount")}</span>
              <span className={styles.amount}>
                {order.currency} {order.totalAmount.toFixed(2)}
              </span>
            </div>
            {order.paidAt && (
              <div className={styles.summaryRow}>
                <span className={styles.label}>{t("paidOn")}</span>
                <span>{formatDate(order.paidAt)}</span>
              </div>
            )}
            {order.refundedAt && (
              <>
                <div className={styles.summaryRow}>
                  <span className={styles.label}>{t("refundedOn")}</span>
                  <span>{formatDate(order.refundedAt)}</span>
                </div>
                {order.refundAmount !== undefined && (
                  <div className={styles.summaryRow}>
                    <span className={styles.label}>{t("refundAmount")}</span>
                    <span className={styles.amount}>
                      {order.currency} {order.refundAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tickets */}
        {order.tickets && order.tickets.length > 0 && (
          <div className={styles.section}>
            <h2>{t("ticketsCount", { count: order.tickets.length })}</h2>
            <div className={styles.ticketsList}>
              {order.tickets.map((ticket) => (
                <Link
                  key={ticket.documentId}
                  href={`/tickets/${ticket.documentId}`}
                  className={styles.ticketCard}
                >
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketType}>{ticket.ticketType}</div>
                    <div className={styles.attendeeName}>{ticket.attendeeName}</div>
                    <code className={styles.ticketCode}>{ticket.ticketCode}</code>
                  </div>
                  <div className={styles.ticketStatus}>
                    <span className={getStatusBadgeClass(ticket.ticketStatus)}>
                      {ticket.ticketStatus}
                    </span>
                    {ticket.checkedInAt && (
                      <span className={styles.checkedIn}>✓ {t("checkedIn")}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {order.event && (
            <Link href={`/events/${order.event.slug}`} className={styles.button}>
              {t("viewEvent")}
            </Link>
          )}
          {canDownloadInvoice && (
            <DownloadInvoiceButton orderId={order.documentId} orderNumber={order.orderNumber} />
          )}
          <Link href="/admin/orders" className={styles.buttonSecondary}>
            {t("myOrders")}
          </Link>
          {canRefund && <RefundButton orderId={order.documentId} />}
        </div>

        {order.refundedAt && (
          <div className={styles.refundNotice}>
            <strong>Note:</strong> {t("refundNotice")}
          </div>
        )}
      </div>
    </div>
  )
}
