import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface EventResultsReminderEmailProps {
  eventName: string
  eventSlug: string
  contactName?: string
  reminderNumber: number
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

const infoBoxStyle = {
  background: "#fff3e0",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  borderLeft: "4px solid #f47920",
}

function getReminderText(reminderNumber: number): string {
  switch (reminderNumber) {
    case 1:
      return "We hope the event went well!"
    case 2:
      return "This is a friendly reminder."
    case 3:
      return "This is your final reminder."
    default:
      return "We hope the event went well!"
  }
}

function getSubjectSuffix(reminderNumber: number): string {
  if (reminderNumber === 1) return ""
  if (reminderNumber === 2) return " (Reminder)"
  return " (Final Reminder)"
}

export function getSubject(eventName: string, reminderNumber: number): string {
  return `Please enter your results for ${eventName}${getSubjectSuffix(reminderNumber)}`
}

export default function EventResultsReminderEmail({
  eventName,
  eventSlug,
  contactName,
  reminderNumber,
  frontendUrl = "https://play14.org",
}: EventResultsReminderEmailProps) {
  const resultsUrl = `${frontendUrl}/admin/events/${eventSlug}?tab=actuals`

  return (
    <Layout preview={`Please enter your results for ${eventName}`}>
      <Heading as="h2">Event Results Needed</Heading>

      {contactName && <Text>Hi {contactName},</Text>}

      <Text>
        {getReminderText(reminderNumber)} Now that <strong>{eventName}</strong> is over, please take
        a moment to enter your event results.
      </Text>

      <div style={infoBoxStyle}>
        <Heading as="h3" style={{ marginTop: 0, color: "#e65100" }}>
          Why is this important?
        </Heading>
        <Text style={{ marginBottom: 0 }}>
          Recording your results helps the #play14 community track the success of events, share
          learnings, and improve future gatherings. It only takes a few minutes!
        </Text>
      </div>

      <Text>Please record your financial results in the Results tab:</Text>
      <ul>
        <li>Actual income (sponsorships, donations, etc.)</li>
        <li>Actual expenses (venue, catering, materials, etc.)</li>
      </ul>

      <Button href={resultsUrl} style={buttonStyle}>
        Enter Results Now
      </Button>

      <Text style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
        If you have any questions or need help, feel free to reach out to the #play14 team.
      </Text>

      <Text style={{ marginTop: "20px" }}>Thank you for being part of the #play14 community!</Text>
    </Layout>
  )
}
