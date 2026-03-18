import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getTicketDetails } from "@/components/tickets/ticket.action"
import styles from "./page.module.scss"

interface TicketPageProps {
  params: Promise<{ ticketId: string }>
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
    case "valid":
      return styles.statusValid
    case "used":
      return styles.statusUsed
    case "refunded":
      return styles.statusRefunded
    case "cancelled":
      return styles.statusCancelled
    default:
      return ""
  }
}

export default async function TicketPage({ params }: TicketPageProps) {
  const t = await getTranslations("orders")
  const resolvedParams = await params
  const ticket = await getTicketDetails(resolvedParams.ticketId)

  if (!ticket) {
    notFound()
  }

  return (
    <div className={styles.container}>
      <div className={styles.ticketCard}>
        <div className={styles.header}>
          <h1>{t("ticketDetails")}</h1>
          <span className={`${styles.status} ${getStatusBadgeClass(ticket.ticketStatus)}`}>
            {ticket.ticketStatus.toUpperCase()}
          </span>
        </div>

        {/* Ticket Code */}
        <div className={styles.ticketCode}>
          <div className={styles.codeLabel}>{t("ticketCode")}</div>
          <code className={styles.code}>{ticket.ticketCode}</code>
        </div>

        {/* Event Information */}
        {ticket.event && (
          <div className={styles.section}>
            <h2>{t("event")}</h2>
            <div className={styles.eventInfo}>
              <Link href={`/events/${ticket.event.slug}`} className={styles.eventName}>
                {ticket.event.name}
              </Link>
              <div className={styles.eventMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("date")}</span>
                  <span>{formatDate(ticket.event.start)}</span>
                </div>
                {ticket.event.location && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>{t("location")}</span>
                    <span>
                      {ticket.event.location.name}
                      {ticket.event.location.country && `, ${ticket.event.location.country}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attendee Information */}
        <div className={styles.section}>
          <h2>{t("attendee")}</h2>
          <div className={styles.attendeeInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>{t("name")}</span>
              <span>{ticket.attendeeName}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>{t("emailLabel")}</span>
              <span>{ticket.attendeeEmail}</span>
            </div>
            {ticket.attendeeDetails?.tshirtSize && ticket.attendeeDetails.tshirtSize !== "none" && (
              <div className={styles.infoRow}>
                <span className={styles.label}>{t("tshirtSize")}</span>
                <span>{ticket.attendeeDetails.tshirtSize}</span>
              </div>
            )}
            {ticket.attendeeDetails?.foodPreferences && (
              <div className={styles.infoRow}>
                <span className={styles.label}>{t("foodPreferences")}</span>
                <span>{ticket.attendeeDetails.foodPreferences}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Type */}
        {ticket.ticketType && (
          <div className={styles.section}>
            <h2>{t("ticketType")}</h2>
            <div className={styles.ticketTypeInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t("type")}</span>
                <span>{ticket.ticketType.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t("price")}</span>
                <span>
                  {ticket.ticketType.currency} {ticket.ticketType.price.toFixed(2)}
                </span>
              </div>
              {ticket.ticketType.description && (
                <div className={styles.description}>{ticket.ticketType.description}</div>
              )}
            </div>
          </div>
        )}

        {/* Check-in Status */}
        {ticket.checkedInAt && (
          <div className={styles.section}>
            <h2>{t("checkIn")}</h2>
            <div className={styles.checkinInfo}>
              <span className={styles.checkinBadge}>✓ {t("checkedIn")}</span>
              <span className={styles.checkinTime}>{formatDate(ticket.checkedInAt)}</span>
            </div>
          </div>
        )}

        {/* Order Information */}
        {ticket.order && (
          <div className={styles.section}>
            <h2>{t("order")}</h2>
            <div className={styles.orderInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t("orderNumber")}</span>
                <span>{ticket.order.orderNumber}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{t("purchasedBy")}</span>
                <span>{ticket.order.purchaserName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {ticket.event && (
            <Link href={`/events/${ticket.event.slug}`} className={styles.button}>
              {t("viewEvent")}
            </Link>
          )}
          <Link href="/admin/orders" className={styles.buttonSecondary}>
            {t("myOrders")}
          </Link>
        </div>
      </div>
    </div>
  )
}
