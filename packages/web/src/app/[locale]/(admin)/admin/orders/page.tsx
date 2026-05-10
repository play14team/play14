import { getTranslations } from "next-intl/server"
import { getMyOrders } from "@/components/tickets/purchase.action"
import { Link } from "@/i18n/navigation"
import { requireAuth } from "@/libs/auth"
import styles from "./page.module.scss"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.orders")
  return {
    title: t("title"),
  }
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
  const t = await getTranslations("adminMisc.orders")
  await requireAuth()

  const orders = await getMyOrders()

  return (
    <div className={styles.container}>
      <h1>{t("title")}</h1>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>{t("noPurchases")}</p>
          <Link href="/events" className={styles.browseLink}>
            {t("browseEvents")}
          </Link>
        </div>
      ) : (
        <div className={styles.orders}>
          {orders.map((order) => (
            <div key={order.documentId} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <span className={styles.orderNumber}>{order.orderNumber}</span>
                <span className={`${styles.status} ${getStatusBadgeClass(order.orderStatus)}`}>
                  {order.orderStatus.toUpperCase()}
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
                  {t("ticketCount", { count: order.ticketCount })}
                </span>
                <span className={styles.amount}>
                  {order.currency} {order.totalAmount.toFixed(2)}
                </span>
              </div>

              {order.paidAt && (
                <p className={styles.purchaseDate}>
                  {t("purchasedOn", { date: formatDate(order.paidAt) })}
                </p>
              )}

              <Link href={`/orders/${order.documentId}`} className={styles.viewDetails}>
                {t("viewOrder")} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
