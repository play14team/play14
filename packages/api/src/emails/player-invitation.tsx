import React from "react"
import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"
import { CalendarSection } from "./components/calendar-section"

interface PlayerInvitationEmailProps {
  playerName: string
  ticketCode: string
  eventName: string
  eventDate: string
  eventTime: string
  eventLocation: string
  resetPasswordUrl: string
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

const codeStyle = {
  background: "#fff3e0",
  padding: "4px 8px",
  borderRadius: "4px",
  fontFamily: "monospace",
  color: "#f47920",
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
  resetPasswordUrl,
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
        <Heading as="h3">Your Ticket</Heading>
        <Text style={{ margin: "0" }}>
          <span style={codeStyle}>{ticketCode}</span>
        </Text>
        <Text style={{ marginTop: "15px", marginBottom: 0 }}>
          <strong>Event:</strong> {eventName}
          <br />
          <strong>Date:</strong> {eventDate} at {eventTime}
          <br />
          <strong>Location:</strong> {eventLocation}
        </Text>
      </div>

      <CalendarSection
        eventDate={eventDate}
        eventTime={eventTime}
        eventLocation={eventLocation}
        googleCalendarUrl={googleCalendarUrl}
        outlookCalendarUrl={outlookCalendarUrl}
      />

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

      <Button href={resetPasswordUrl} style={buttonStyle}>
        Create Your Account
      </Button>

      <Text style={{ marginTop: "30px" }}>See you at the event!</Text>
    </Layout>
  )
}
