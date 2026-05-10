import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getOrderStatus } from "@/components/tickets/purchase.action"
import AutoRedirect from "./auto-redirect"
import styles from "./page.module.scss"

interface SuccessPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function TicketSuccessPage({ params, searchParams }: SuccessPageProps) {
  const t = await getTranslations("orders")
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const orderId = resolvedSearchParams.order

  if (!orderId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1 className={styles.title}>{t("orderNotFound")}</h1>
          <p>{t("orderNotFoundDescription")}</p>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            {t("returnToEvent")}
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
          <h1 className={styles.title}>{t("orderNotFound")}</h1>
          <p>{t("orderNotFoundDescription")}</p>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            {t("returnToEvent")}
          </Link>
        </div>
      </div>
    )
  }

  const isPaid = order.orderStatus === "paid"

  // If payment is confirmed, show success message and auto-redirect
  if (isPaid) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          <div className={styles.icon}>✓</div>

          <h1 className={styles.title}>{t("paymentSuccessful")}</h1>

          <p className={styles.subtitle}>{t("purchaseConfirmed")}</p>

          <div className={styles.orderInfo}>
            <p>{t("orderHash", { orderNumber: order.orderNumber })}</p>
            <p className={styles.eventName}>{order.event.name}</p>
            <p className={styles.amount}>
              {order.currency} {order.totalAmount.toFixed(2)}
            </p>
          </div>

          <p className={styles.redirectMessage}>{t("redirecting")}</p>

          <AutoRedirect orderId={order.documentId} />

          <div className={styles.actions}>
            <Link href={`/orders/${order.documentId}`} className={styles.button}>
              {t("viewOrderDetails")}
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

        <h1 className={styles.title}>{t("processingPayment")}</h1>

        <p className={styles.subtitle}>{t("paymentProcessing")}</p>

        <div className={styles.orderInfo}>
          <p>{t("orderHash", { orderNumber: order.orderNumber })}</p>
          <p className={styles.eventName}>{order.event.name}</p>
        </div>

        <div className={styles.actions}>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            {t("returnToEvent")}
          </Link>
        </div>
      </div>
    </div>
  )
}
