import React from "react"
import { Heading, Link, Text } from "@react-email/components"

interface CalendarSectionProps {
  eventDate: string
  eventTime: string
  eventLocation: string
  googleCalendarUrl?: string
  outlookCalendarUrl?: string
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
  margin: "8px 8px 8px 0",
}

export function CalendarSection({
  eventDate,
  eventTime,
  eventLocation,
  googleCalendarUrl,
  outlookCalendarUrl,
}: CalendarSectionProps) {
  if (!googleCalendarUrl && !outlookCalendarUrl) {
    return null
  }

  return (
    <div style={calendarBoxStyle}>
      <Heading as="h3" style={{ marginTop: 0, color: "#1976d2" }}>
        Add to Your Calendar
      </Heading>
      <Text style={{ marginBottom: "15px" }}>
        <strong>Date:</strong> {eventDate} at {eventTime}
        <br />
        <strong>Location:</strong> {eventLocation}
      </Text>
      <div>
        {googleCalendarUrl && (
          <Link href={googleCalendarUrl} style={calendarButtonStyle}>
            Google Calendar
          </Link>
        )}{" "}
        {outlookCalendarUrl && (
          <Link href={outlookCalendarUrl} style={{ ...calendarButtonStyle, background: "#0078d4" }}>
            Outlook
          </Link>
        )}
      </div>
      <Text style={{ marginTop: "12px", marginBottom: 0, fontSize: "12px", color: "#666" }}>
        An .ics calendar file is also attached to this email for other calendar apps.
      </Text>
    </div>
  )
}
