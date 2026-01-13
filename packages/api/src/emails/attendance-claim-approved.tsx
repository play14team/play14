import React from "react"
import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface AttendanceClaimApprovedEmailProps {
  eventName: string
  eventDate: string
  locationName: string
  playerSlug: string
  frontendUrl?: string
}

const buttonStyle = {
  backgroundColor: "#4CAF50",
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

export default function AttendanceClaimApprovedEmail({
  eventName,
  eventDate,
  locationName,
  playerSlug,
  frontendUrl = "https://play14.org",
}: AttendanceClaimApprovedEmailProps) {
  return (
    <Layout preview="Your Attendance Claim Has Been Approved!">
      <Heading as="h2">Attendance Claim Approved!</Heading>
      <Text>
        Great news! Your claim to be listed as an attendee for <strong>{eventName}</strong> has been
        approved.
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

      <Text>This event is now visible on your player profile.</Text>

      <Button href={`${frontendUrl}/players/${playerSlug}`} style={buttonStyle}>
        View Your Profile
      </Button>

      <Text style={{ marginTop: "30px", color: "#666", fontSize: "12px" }}>
        This email was sent automatically by the #play14 community platform.
      </Text>
    </Layout>
  )
}
