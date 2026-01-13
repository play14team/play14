import React from "react"
import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface AttendanceClaimNewEmailProps {
  eventName: string
  eventDate: string
  locationName: string
  playerName: string
  playerPosition: string
  reason: string
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

export default function AttendanceClaimNewEmail({
  eventName,
  eventDate,
  locationName,
  playerName,
  playerPosition,
  reason,
  frontendUrl = "https://play14.org",
}: AttendanceClaimNewEmailProps) {
  return (
    <Layout preview="New Attendance Claim Request">
      <Heading as="h2">New Attendance Claim Request</Heading>
      <Text>A player has submitted a claim to be listed as an attendee for your event.</Text>

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

      <Heading as="h3">Claiming Player:</Heading>
      <div style={detailsBoxStyle}>
        <Text style={{ margin: "5px 0" }}>
          <strong>Name:</strong> {playerName}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Position:</strong> {playerPosition}
        </Text>
      </div>

      <Heading as="h3">Reason Provided:</Heading>
      <div style={detailsBoxStyle}>
        <Text>{reason}</Text>
      </div>

      <Button href={`${frontendUrl}/admin/attendance-claims`} style={buttonStyle}>
        Review Attendance Claims
      </Button>

      <Text style={{ marginTop: "30px", color: "#666", fontSize: "12px" }}>
        This email was sent automatically by the #play14 community platform.
      </Text>
    </Layout>
  )
}
