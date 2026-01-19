import { getOrderStatus } from "@/components/tickets/purchase.action"
import Link from "next/link"
import AutoRedirect from "./auto-redirect"
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

  // If payment is confirmed, show success message and auto-redirect
  if (isPaid) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          <div className={styles.icon}>✓</div>

          <h1 className={styles.title}>Payment Successful!</h1>

          <p className={styles.subtitle}>Your ticket purchase has been confirmed.</p>

          <div className={styles.orderInfo}>
            <p>Order #{order.orderNumber}</p>
            <p className={styles.eventName}>{order.event.name}</p>
            <p className={styles.amount}>
              {order.currency} {order.totalAmount.toFixed(2)}
            </p>
          </div>

          <p className={styles.redirectMessage}>Redirecting to your order details...</p>

          <AutoRedirect orderId={order.documentId} />

          <div className={styles.actions}>
            <Link href={`/orders/${order.documentId}`} className={styles.button}>
              View Order Details
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Payment is still processing
  return (
    <div className={styles.container}>
      <div className={styles.pending}>
        <div className={styles.icon}>⏳</div>

        <h1 className={styles.title}>Processing Payment</h1>

        <p className={styles.subtitle}>Your payment is being processed. Please wait a moment.</p>

        <div className={styles.orderInfo}>
          <p>Order #{order.orderNumber}</p>
          <p className={styles.eventName}>{order.event.name}</p>
        </div>

        <div className={styles.actions}>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            Return to Event
          </Link>
        </div>
      </div>
    </div>
  )
}
