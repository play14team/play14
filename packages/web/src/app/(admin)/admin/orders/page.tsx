import Link from "next/link"
import { getMyOrders } from "@/components/tickets/purchase.action"
import { requireAuth } from "@/libs/auth"
import styles from "./page.module.scss"

export const metadata = {
  title: "Orders | #play14",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
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

export default async function MyOrdersPage() {
  await requireAuth()

  const orders = await getMyOrders()

  return (
    <div className={styles.container}>
      <h1>Orders</h1>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven&apos;t purchased any tickets yet.</p>
          <Link href="/events" className={styles.browseLink}>
            Browse Events
          </Link>
        </div>
      ) : (
        <div className={styles.orders}>
          {orders.map((order) => (
            <div key={order.documentId} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <span className={styles.orderNumber}>{order.orderNumber}</span>
                <span className={`${styles.status} ${getStatusBadgeClass(order.status)}`}>
                  {order.status.toUpperCase()}
                </span>
              </div>

              <div className={styles.eventInfo}>
                <h3>
                  <Link href={`/events/${order.event.slug}`}>{order.event.name}</Link>
                </h3>
                <p className={styles.eventDate}>
                  {formatDate(order.event.start)} - {formatDate(order.event.end)}
                </p>
              </div>

              <div className={styles.orderMeta}>
                <span className={styles.ticketCount}>
                  {order.ticketCount} {order.ticketCount === 1 ? "ticket" : "tickets"}
                </span>
                <span className={styles.amount}>
                  {order.currency} {order.totalAmount.toFixed(2)}
                </span>
              </div>

              {order.paidAt && (
                <p className={styles.purchaseDate}>Purchased on {formatDate(order.paidAt)}</p>
              )}

              <Link href={`/orders/${order.documentId}`} className={styles.viewDetails}>
                View Order →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
