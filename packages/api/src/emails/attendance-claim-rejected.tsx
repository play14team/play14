import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface AttendanceClaimRejectedEmailProps {
  eventName: string
  eventDate: string
  locationName: string
  adminNotes?: string
  frontendUrl?: string
}

const buttonStyle = {
  backgroundColor: "#2196F3",
  color: "#ffffff",
  padding: "10px 20px",
  textDecoration: "none",
  borderRadius: "5px",
  display: "inline-block",
}

const detailsBoxStyle = {
  background: "#f5f5f5",
  padding: "15px",
  borderRadius: "5px",
  margin: "15px 0",
}

export default function AttendanceClaimRejectedEmail({
  eventName,
  eventDate,
  locationName,
  adminNotes,
  frontendUrl = "https://play14.org",
}: AttendanceClaimRejectedEmailProps) {
  return (
    <Layout preview="Attendance Claim Update">
      <Heading as="h2">Attendance Claim Update</Heading>
      <Text>
        Unfortunately, your claim to be listed as an attendee for <strong>{eventName}</strong> could
        not be approved.
      </Text>

      <Heading as="h3">Event Details:</Heading>
      <div style={detailsBoxStyle}>
        <Text style={{ margin: "5px 0" }}>
          <strong>Event:</strong> {eventName}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Date:</strong> {eventDate}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Location:</strong> {locationName}
        </Text>
      </div>

      {adminNotes && (
        <>
          <Heading as="h3">Reason:</Heading>
          <div style={detailsBoxStyle}>
            <Text>{adminNotes}</Text>
          </div>
        </>
      )}

      <Text>If you believe this is an error, please contact the event organizers directly.</Text>

      <Button href={`${frontendUrl}/contact`} style={buttonStyle}>
        Contact Us
      </Button>

      <Text style={{ marginTop: "30px", color: "#666", fontSize: "12px" }}>
        This email was sent automatically by the #play14 community platform.
      </Text>
    </Layout>
  )
}
