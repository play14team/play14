import React from "react"
import { Button, Heading, Link, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface PlayerInvitationEmailProps {
  playerName: string
  ticketCode: string
  eventName: string
  eventDate: string
  eventTime: string
  eventLocation: string
  claimUrl: string
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

const ticketBoxStyle = {
  background: "#f9f9f9",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
}

const ticketCodeStyle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#f47920",
  letterSpacing: "2px",
}

const calendarBoxStyle = {
  background: "#f0f7ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  borderLeft: "4px solid #2196f3",
}

const calendarButtonStyle = {
  display: "inline-block",
  background: "#4285f4",
  color: "#ffffff",
  padding: "10px 16px",
  textDecoration: "none",
  borderRadius: "4px",
  fontSize: "13px",
  margin: "5px",
}

const featuresList = {
  margin: "20px 0",
  paddingLeft: "20px",
}

export default function PlayerInvitationEmail({
  playerName,
  ticketCode,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  claimUrl,
  googleCalendarUrl,
  outlookCalendarUrl,
  frontendUrl = "https://play14.org",
}: PlayerInvitationEmailProps) {
  const firstName = playerName.split(" ")[0]

  return (
    <Layout preview={`Your ticket for ${eventName} - Create your profile`}>
      <Heading as="h2">Welcome to #play14!</Heading>
      <Text>Hi {firstName},</Text>
      <Text>
        You've been registered for <strong>{eventName}</strong>!
      </Text>

      <div style={ticketBoxStyle}>
        <Text style={{ margin: 0 }}>
          <strong>Your Ticket</strong>
        </Text>
        <Text style={ticketCodeStyle}>{ticketCode}</Text>
        <Text style={{ marginTop: "15px", marginBottom: 0 }}>
          <strong>Event:</strong> {eventName}
          <br />
          <strong>Date:</strong> {eventDate} at {eventTime}
          <br />
          <strong>Location:</strong> {eventLocation}
        </Text>
      </div>

      {(googleCalendarUrl || outlookCalendarUrl) && (
        <div style={calendarBoxStyle}>
          <Heading as="h3" style={{ marginTop: 0, color: "#1976d2" }}>
            Add to Your Calendar
          </Heading>
          <div>
            {googleCalendarUrl && (
              <Link href={googleCalendarUrl} style={calendarButtonStyle}>
                Google Calendar
              </Link>
            )}
            {outlookCalendarUrl && (
              <Link href={outlookCalendarUrl} style={{ ...calendarButtonStyle, background: "#0078d4" }}>
                Outlook
              </Link>
            )}
          </div>
          <Text style={{ marginTop: "12px", marginBottom: 0, fontSize: "12px", color: "#666" }}>
            An .ics calendar file is also attached to this email.
          </Text>
        </div>
      )}

      <Text>Create your #play14 account to:</Text>
      <ul style={featuresList}>
        <li>
          <Text style={{ margin: "8px 0" }}>Manage your player profile</Text>
        </li>
        <li>
          <Text style={{ margin: "8px 0" }}>View all your tickets</Text>
        </li>
        <li>
          <Text style={{ margin: "8px 0" }}>Connect with the community</Text>
        </li>
        <li>
          <Text style={{ margin: "8px 0" }}>Get updates about events</Text>
        </li>
      </ul>

      <Button href={claimUrl} style={buttonStyle}>
        Create Your Account
      </Button>

      <Text style={{ marginTop: "30px" }}>See you at the event!</Text>
    </Layout>
  )
}
