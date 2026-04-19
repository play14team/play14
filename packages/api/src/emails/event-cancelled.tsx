import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface EventCancelledEmailProps {
  eventName: string
  eventDate: string
  eventLocation: string
  purchaserName: string
  frontendUrl?: string
  cancellationReason?: string
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

const noticeBoxStyle = {
  background: "#fff3f3",
  borderLeft: "4px solid #e53935",
  padding: "15px",
  margin: "20px 0",
}

const reasonBoxStyle = {
  background: "#f9f9f9",
  padding: "15px",
  borderRadius: "8px",
  margin: "16px 0",
}

export default function EventCancelledEmail({
  eventName,
  eventDate,
  eventLocation,
  purchaserName,
  frontendUrl = "https://play14.org",
  cancellationReason,
}: EventCancelledEmailProps) {
  const firstName = purchaserName.split(" ")[0] || purchaserName

  return (
    <Layout preview={`${eventName} has been cancelled`}>
      <Heading as="h2">Event cancelled</Heading>
      <Text>Hi {firstName},</Text>
      <Text>
        We're sorry to share that <strong>{eventName}</strong> has been cancelled.
      </Text>

      <div style={noticeBoxStyle}>
        <Text style={{ margin: 0 }}>
          <strong>Event:</strong> {eventName}
          <br />
          <strong>Date:</strong> {eventDate}
          <br />
          <strong>Location:</strong> {eventLocation}
        </Text>
      </div>

      {cancellationReason && (
        <div style={reasonBoxStyle}>
          <Text style={{ margin: 0 }}>
            <strong>Reason:</strong> {cancellationReason}
          </Text>
        </div>
      )}

      <Text>
        If you purchased tickets for this event, a refund will be processed automatically to the
        original payment method. Refunds typically appear on your statement within 5-10 business
        days.
      </Text>

      <Text>
        We're sorry for the inconvenience and hope to see you at another #play14 event soon. You can
        browse upcoming events from the link below.
      </Text>

      <Button href={`${frontendUrl}/events`} style={buttonStyle}>
        Browse upcoming events
      </Button>

      <Text style={{ marginTop: "30px" }}>
        If you have any questions, reply to this email and our team will get back to you.
      </Text>
    </Layout>
  )
}
