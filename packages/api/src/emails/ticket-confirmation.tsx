import { Button, Heading, Link, Text } from "@react-email/components"
import { CalendarSection } from "./components/calendar-section"
import { Layout } from "./components/layout"

interface TicketConfirmationEmailProps {
  orderNumber: string
  eventName: string
  eventDate: string
  eventTime: string
  eventLocation: string
  currency: string
  totalAmount: number
  contactEmail?: string
  tickets: Array<{
    ticketTypeName: string
    ticketCode: string
    attendeeName: string
  }>
  googleCalendarUrl?: string
  outlookCalendarUrl?: string
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
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
}

const codeStyle = {
  background: "#fff3e0",
  padding: "4px 8px",
  borderRadius: "4px",
  fontFamily: "monospace",
  color: "#f47920",
}

export default function TicketConfirmationEmail({
  orderNumber,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  currency,
  totalAmount,
  contactEmail,
  tickets,
  googleCalendarUrl,
  outlookCalendarUrl,
  frontendUrl = "https://play14.org",
}: TicketConfirmationEmailProps) {
  return (
    <Layout preview={`Your tickets for ${eventName}`}>
      <Heading as="h2">Thank you for your purchase!</Heading>
      <Text>
        <strong>Order:</strong> {orderNumber}
      </Text>
      <Text>
        <strong>Event:</strong> {eventName}
      </Text>
      <Text>
        <strong>Amount:</strong> {currency} {totalAmount.toFixed(2)}
      </Text>

      <div style={ticketsBoxStyle}>
        <Heading as="h3">Your Tickets</Heading>
        {tickets.map((ticket, index) => (
          <div
            key={index}
            style={{
              padding: "12px 0",
              borderBottom: index < tickets.length - 1 ? "1px solid #eee" : "none",
            }}
          >
            <Text style={{ margin: "0" }}>
              <strong>{ticket.ticketTypeName}:</strong>{" "}
              <span style={codeStyle}>{ticket.ticketCode}</span>
            </Text>
            <Text style={{ color: "#666", fontSize: "13px", margin: "4px 0 0 0" }}>
              Attendee: {ticket.attendeeName}
            </Text>
          </div>
        ))}
      </div>

      <CalendarSection
        eventDate={eventDate}
        eventTime={eventTime}
        eventLocation={eventLocation}
        googleCalendarUrl={googleCalendarUrl}
        outlookCalendarUrl={outlookCalendarUrl}
      />

      <Text>Keep these ticket codes safe - you'll need them for check-in at the event.</Text>

      {contactEmail && (
        <Text>
          If you have any questions about the event, contact the organizers at{" "}
          <Link href={`mailto:${contactEmail}`} style={{ color: "#f47920" }}>
            {contactEmail}
          </Link>
        </Text>
      )}

      <Button href={`${frontendUrl}/admin/orders`} style={buttonStyle}>
        View Your Orders
      </Button>

      <Text style={{ marginTop: "30px" }}>See you at the event!</Text>
    </Layout>
  )
}
