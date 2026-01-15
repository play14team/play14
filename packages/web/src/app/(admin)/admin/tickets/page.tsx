import Link from "next/link"
import { getMyTickets } from "@/components/tickets/ticket.action"
import { requireAuth } from "@/libs/auth"
import styles from "./page.module.scss"

export const metadata = {
  title: "Tickets | #play14",
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
    case "valid":
      return styles.statusValid
    case "used":
      return styles.statusUsed
    case "cancelled":
      return styles.statusCancelled
    case "refunded":
      return styles.statusRefunded
    default:
      return ""
  }
}

export default async function MyTicketsPage() {
  await requireAuth()

  const tickets = await getMyTickets()

  return (
    <div className={styles.container}>
      <h1>Tickets</h1>

      {tickets.length === 0 ? (
        <div className={styles.empty}>
          <p>You don&apos;t have any tickets yet.</p>
          <Link href="/events" className={styles.browseLink}>
            Browse Events
          </Link>
        </div>
      ) : (
        <div className={styles.tickets}>
          {tickets.map((ticket) => (
            <div key={ticket.documentId} className={styles.ticketCard}>
              <div className={styles.ticketHeader}>
                <span className={styles.ticketCode}>{ticket.ticketCode}</span>
                <span className={`${styles.status} ${getStatusBadgeClass(ticket.ticketStatus)}`}>
                  {ticket.ticketStatus.toUpperCase()}
                </span>
              </div>

              <div className={styles.eventInfo}>
                <h3>
                  <Link href={`/events/${ticket.event.slug}`}>{ticket.event.name}</Link>
                </h3>
                <p className={styles.eventDate}>
                  {formatDate(ticket.event.start)} - {formatDate(ticket.event.end)}
                </p>
                {ticket.event.location && (
                  <p className={styles.eventLocation}>{ticket.event.location.name}</p>
                )}
              </div>

              <div className={styles.attendeeInfo}>
                <div className={styles.attendeeField}>
                  <span className={styles.label}>Attendee:</span>
                  <span className={styles.value}>{ticket.attendeeName}</span>
                </div>
                <div className={styles.attendeeField}>
                  <span className={styles.label}>Email:</span>
                  <span className={styles.value}>{ticket.attendeeEmail}</span>
                </div>
                {ticket.ticketType && (
                  <div className={styles.attendeeField}>
                    <span className={styles.label}>Type:</span>
                    <span className={styles.value}>{ticket.ticketType.name}</span>
                  </div>
                )}
                {ticket.checkedInAt && (
                  <div className={styles.attendeeField}>
                    <span className={styles.label}>Checked In:</span>
                    <span className={styles.value}>{formatDate(ticket.checkedInAt)}</span>
                  </div>
                )}
              </div>

              {ticket.order && (
                <p className={styles.orderNumber}>Order: {ticket.order.orderNumber}</p>
              )}

              <Link href={`/tickets/${ticket.documentId}`} className={styles.viewDetails}>
                View Ticket Details →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
