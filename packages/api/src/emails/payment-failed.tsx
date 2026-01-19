import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface PaymentFailedEmailProps {
  orderNumber: string
  eventName: string
  eventSlug: string
  errorMessage: string
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

const errorBoxStyle = {
  background: "#fff3f3",
  borderLeft: "4px solid #e53935",
  padding: "15px",
  margin: "20px 0",
}

export default function PaymentFailedEmail({
  orderNumber,
  eventName,
  eventSlug,
  errorMessage,
  frontendUrl = "https://play14.org",
}: PaymentFailedEmailProps) {
  return (
    <Layout preview={`Payment failed for ${eventName}`}>
      <Heading as="h2">Payment Failed</Heading>
      <Text>Unfortunately, your payment could not be processed.</Text>

      <Text>
        <strong>Order:</strong> {orderNumber}
      </Text>
      <Text>
        <strong>Event:</strong> {eventName}
      </Text>

      <div style={errorBoxStyle}>
        <Text style={{ margin: 0 }}>
          <strong>Error:</strong> {errorMessage}
        </Text>
      </div>

      <Text>
        This can happen for various reasons, such as insufficient funds, incorrect card details, or
        a temporary issue with your bank.
      </Text>

      <Button href={`${frontendUrl}/events/${eventSlug}`} style={buttonStyle}>
        Try Again
      </Button>

      <Text style={{ marginTop: "30px" }}>
        If you continue to experience issues, please contact us.
      </Text>
    </Layout>
  )
}
