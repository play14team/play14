import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { cancelPendingOrder } from "@/components/tickets/purchase.action"
import styles from "./page.module.scss"

interface CancelledPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function TicketCancelledPage({ params, searchParams }: CancelledPageProps) {
  const t = await getTranslations("orders")
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  // Cancel the pending order if we have an order ID
  if (resolvedSearchParams.order) {
    await cancelPendingOrder(resolvedSearchParams.order)
  }

  return (
    <div className={styles.container}>
      <div className={styles.cancelled}>
        <div className={styles.icon}>✕</div>

        <h1 className={styles.title}>{t("paymentCancelled")}</h1>

        <p className={styles.subtitle}>{t("paymentCancelledDescription")}</p>

        <p className={styles.info}>{t("paymentCancelledInfo")}</p>

        <div className={styles.actions}>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            {t("returnToEvent")}
          </Link>
        </div>
      </div>
    </div>
  )
}
