import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface TicketSoldNotificationEmailProps {
  eventName: string
  eventSlug?: string
  orderNumber: string
  purchaserName?: string
  purchaserEmail?: string
  currency: string
  totalAmount: number
  tickets: Array<{
    ticketTypeName: string
    attendeeName: string
    attendeeEmail: string
  }>
  frontendUrl?: string
}

const buttonStyle = {
  backgroundColor: "#f47920",
  color: "#ffffff",
  padding: "14px 28px",
  textDecoration: "none",
  borderRadius: "6px",
  display: "inline-block",
  fontWeight: "bold" as const,
  marginTop: "20px",
}

const ticketsBoxStyle = {
  background: "#f9f9f9",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
}

const ticketRowStyle = {
  padding: "10px 0",
  borderBottom: "1px solid #eee",
}

export default function TicketSoldNotificationEmail({
  eventName,
  eventSlug,
  orderNumber,
  purchaserName,
  purchaserEmail,
  currency,
  totalAmount,
  tickets,
  frontendUrl = "https://play14.org",
}: TicketSoldNotificationEmailProps) {
  const totalTickets = tickets.length
  const formattedAmount = Number(totalAmount || 0).toFixed(2)
  const showTickets = tickets.length > 0

  return (
    <Layout preview={`New ticket order for ${eventName}`}>
      <Heading as="h2">New ticket order</Heading>
      <Text>
        <strong>Event:</strong> {eventName}
      </Text>
      <Text>
        <strong>Order:</strong> {orderNumber}
      </Text>
      {purchaserName && (
        <Text>
          <strong>Purchaser:</strong> {purchaserName}
        </Text>
      )}
      {purchaserEmail && (
        <Text>
          <strong>Purchaser Email:</strong> {purchaserEmail}
        </Text>
      )}
      <Text>
        <strong>Total Tickets:</strong> {totalTickets}
      </Text>
      <Text>
        <strong>Total Amount:</strong> {currency} {formattedAmount}
      </Text>

      <div style={ticketsBoxStyle}>
        <Heading as="h3">Tickets</Heading>
        {showTickets ? (
          tickets.map((ticket, index) => (
            <div
              key={`${ticket.ticketTypeName}-${ticket.attendeeEmail}-${index}`}
              style={{
                ...ticketRowStyle,
                borderBottom: index < tickets.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              <Text style={{ margin: "0" }}>
                <strong>{ticket.ticketTypeName}</strong>
                {ticket.attendeeName ? ` - ${ticket.attendeeName}` : ""}
                {ticket.attendeeEmail ? ` (${ticket.attendeeEmail})` : ""}
              </Text>
            </div>
          ))
        ) : (
          <Text style={{ margin: "0" }}>No ticket details available.</Text>
        )}
      </div>

      {eventSlug && (
        <Button href={`${frontendUrl}/events/${eventSlug}`} style={buttonStyle}>
          View Event
        </Button>
      )}
    </Layout>
  )
}
