import { getTicketDetails } from "@/components/tickets/ticket.action"
import Link from "next/link"
import { notFound } from "next/navigation"
import styles from "./page.module.scss"

interface TicketPageProps {
  params: Promise<{ ticketId: string }>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
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
  const resolvedParams = await params
  const ticket = await getTicketDetails(resolvedParams.ticketId)

  if (!ticket) {
    notFound()
  }

  return (
    <div className={styles.container}>
      <div className={styles.ticketCard}>
        <div className={styles.header}>
          <h1>Ticket Details</h1>
          <span className={`${styles.status} ${getStatusBadgeClass(ticket.ticketStatus)}`}>
            {ticket.ticketStatus.toUpperCase()}
          </span>
        </div>

        {/* Ticket Code */}
        <div className={styles.ticketCode}>
          <div className={styles.codeLabel}>Ticket Code</div>
          <code className={styles.code}>{ticket.ticketCode}</code>
        </div>

        {/* Event Information */}
        {ticket.event && (
          <div className={styles.section}>
            <h2>Event</h2>
            <div className={styles.eventInfo}>
              <Link href={`/events/${ticket.event.slug}`} className={styles.eventName}>
                {ticket.event.name}
              </Link>
              <div className={styles.eventMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Date:</span>
                  <span>{formatDate(ticket.event.start)}</span>
                </div>
                {ticket.event.location && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Location:</span>
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
          <h2>Attendee</h2>
          <div className={styles.attendeeInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Name:</span>
              <span>{ticket.attendeeName}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Email:</span>
              <span>{ticket.attendeeEmail}</span>
            </div>
            {ticket.attendeeDetails?.tshirtSize && ticket.attendeeDetails.tshirtSize !== "none" && (
              <div className={styles.infoRow}>
                <span className={styles.label}>T-Shirt Size:</span>
                <span>{ticket.attendeeDetails.tshirtSize}</span>
              </div>
            )}
            {ticket.attendeeDetails?.foodPreferences && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Food Preferences:</span>
                <span>{ticket.attendeeDetails.foodPreferences}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Type */}
        {ticket.ticketType && (
          <div className={styles.section}>
            <h2>Ticket Type</h2>
            <div className={styles.ticketTypeInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Type:</span>
                <span>{ticket.ticketType.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Price:</span>
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
            <h2>Check-in</h2>
            <div className={styles.checkinInfo}>
              <span className={styles.checkinBadge}>✓ Checked in</span>
              <span className={styles.checkinTime}>{formatDate(ticket.checkedInAt)}</span>
            </div>
          </div>
        )}

        {/* Order Information */}
        {ticket.order && (
          <div className={styles.section}>
            <h2>Order</h2>
            <div className={styles.orderInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Order Number:</span>
                <span>{ticket.order.orderNumber}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Purchased by:</span>
                <span>{ticket.order.purchaserName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {ticket.event && (
            <Link href={`/events/${ticket.event.slug}`} className={styles.button}>
              View Event
            </Link>
          )}
          <Link href="/admin/orders" className={styles.buttonSecondary}>
            My Orders
          </Link>
        </div>
      </div>
    </div>
  )
}
