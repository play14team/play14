import Link from "next/link"
import { getOrderStatus } from "@/components/tickets/purchase.action"
import styles from "./page.module.scss"

interface SuccessPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function TicketSuccessPage({ params, searchParams }: SuccessPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const orderId = resolvedSearchParams.order

  if (!orderId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1 className={styles.title}>Order Not Found</h1>
          <p>We could not find your order details.</p>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            Return to Event
          </Link>
        </div>
      </div>
    )
  }

  const order = await getOrderStatus(orderId)

  if (!order) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1 className={styles.title}>Order Not Found</h1>
          <p>We could not find your order details.</p>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            Return to Event
          </Link>
        </div>
      </div>
    )
  }

  const isPaid = order.status === "paid"

  return (
    <div className={styles.container}>
      <div className={isPaid ? styles.success : styles.pending}>
        <div className={styles.icon}>{isPaid ? "✓" : "⏳"}</div>

        <h1 className={styles.title}>{isPaid ? "Thank You!" : "Processing Payment"}</h1>

        <p className={styles.subtitle}>
          {isPaid
            ? "Your ticket purchase was successful."
            : "Your payment is being processed. Please wait a moment."}
        </p>

        <div className={styles.orderDetails}>
          <h2>Order Details</h2>
          <dl>
            <dt>Order Number</dt>
            <dd>{order.orderNumber}</dd>

            <dt>Event</dt>
            <dd>{order.event.name}</dd>

            <dt>Total</dt>
            <dd>
              {order.currency} {order.totalAmount.toFixed(2)}
            </dd>

            <dt>Status</dt>
            <dd className={styles[order.status]}>{order.status.toUpperCase()}</dd>
          </dl>
        </div>

        {isPaid && order.tickets && order.tickets.length > 0 && (
          <div className={styles.tickets}>
            <h2>Your Tickets</h2>
            <ul>
              {order.tickets.map((ticket) => (
                <li key={ticket.documentId}>
                  <span className={styles.ticketType}>{ticket.ticketType}</span>
                  <code className={styles.ticketCode}>{ticket.ticketCode}</code>
                </li>
              ))}
            </ul>
            <p className={styles.note}>
              A confirmation email with your ticket codes has been sent to {order.purchaserEmail}
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            Return to Event
          </Link>
          <Link href="/admin/tickets" className={styles.buttonSecondary}>
            View All My Tickets
          </Link>
        </div>
      </div>
    </div>
  )
}
