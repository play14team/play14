import { cancelPendingOrder } from "@/components/tickets/purchase.action"
import Link from "next/link"
import styles from "./page.module.scss"

interface CancelledPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function TicketCancelledPage({ params, searchParams }: CancelledPageProps) {
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

        <h1 className={styles.title}>Payment Cancelled</h1>

        <p className={styles.subtitle}>
          Your ticket purchase was cancelled. No payment has been processed.
        </p>

        <p className={styles.info}>
          If you experienced any issues during checkout, please try again or contact the event
          organizers for assistance.
        </p>

        <div className={styles.actions}>
          <Link href={`/events/${resolvedParams.slug}`} className={styles.button}>
            Return to Event
          </Link>
        </div>
      </div>
    </div>
  )
}
