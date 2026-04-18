import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

type StripeAccountStatus = "pending" | "active" | "restricted" | "disabled"

interface StripeAccountStatusEmailProps {
  hostName: string
  previousStatus: StripeAccountStatus
  currentStatus: StripeAccountStatus
  frontendUrl?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
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

const calloutStyleActive = {
  background: "#e8f5e9",
  borderLeft: "4px solid #2e7d32",
  padding: "15px",
  margin: "20px 0",
}

const calloutStyleRestricted = {
  background: "#fff8e1",
  borderLeft: "4px solid #f9a825",
  padding: "15px",
  margin: "20px 0",
}

const calloutStyleDisabled = {
  background: "#fff3f3",
  borderLeft: "4px solid #e53935",
  padding: "15px",
  margin: "20px 0",
}

const capabilityRowStyle = {
  margin: "6px 0",
  fontSize: "14px",
  color: "#555",
}

function copyFor(status: StripeAccountStatus) {
  switch (status) {
    case "active":
      return {
        heading: "Your Stripe account is ready",
        intro:
          "Great news - your connected Stripe account is now active. You can start selling tickets and receiving payouts directly to your bank account.",
        callout: (
          <div style={calloutStyleActive}>
            <Text style={{ margin: 0 }}>
              <strong>Status:</strong> Active &mdash; payments and payouts are enabled.
            </Text>
          </div>
        ),
        ctaLabel: "Manage your events",
        ctaPath: "/admin/events",
      }
    case "restricted":
      return {
        heading: "Action needed on your Stripe account",
        intro:
          "Stripe needs a bit more information before your account can process payments. This usually takes only a few minutes to resolve.",
        callout: (
          <div style={calloutStyleRestricted}>
            <Text style={{ margin: 0 }}>
              <strong>Status:</strong> Restricted &mdash; please review the outstanding requirements
              in your Stripe dashboard.
            </Text>
          </div>
        ),
        ctaLabel: "Open Stripe dashboard",
        ctaPath: "/admin/payments",
      }
    case "disabled":
      return {
        heading: "Your Stripe account has been disabled",
        intro:
          "Your connected Stripe account has been disabled and can no longer accept payments. Please contact support so we can help restore your account.",
        callout: (
          <div style={calloutStyleDisabled}>
            <Text style={{ margin: 0 }}>
              <strong>Status:</strong> Disabled &mdash; new ticket sales are paused.
            </Text>
          </div>
        ),
        ctaLabel: "Contact support",
        ctaPath: "/contact",
      }
    default:
      return {
        heading: "Stripe account update",
        intro: "Your Stripe account status has changed.",
        callout: null,
        ctaLabel: "Open your dashboard",
        ctaPath: "/admin",
      }
  }
}

export default function StripeAccountStatusEmail({
  hostName,
  previousStatus,
  currentStatus,
  frontendUrl = "https://play14.org",
  chargesEnabled,
  payoutsEnabled,
  detailsSubmitted,
}: StripeAccountStatusEmailProps) {
  const { heading, intro, callout, ctaLabel, ctaPath } = copyFor(currentStatus)

  return (
    <Layout preview={heading}>
      <Heading as="h2">{heading}</Heading>
      <Text>Hi {hostName},</Text>
      <Text>{intro}</Text>

      <Text>
        <strong>Previous status:</strong> {previousStatus}
        <br />
        <strong>New status:</strong> {currentStatus}
      </Text>

      {callout}

      <div style={{ margin: "16px 0" }}>
        <Text style={capabilityRowStyle}>
          <strong>Charges enabled:</strong> {chargesEnabled ? "Yes" : "No"}
        </Text>
        <Text style={capabilityRowStyle}>
          <strong>Payouts enabled:</strong> {payoutsEnabled ? "Yes" : "No"}
        </Text>
        <Text style={capabilityRowStyle}>
          <strong>Details submitted:</strong> {detailsSubmitted ? "Yes" : "No"}
        </Text>
      </div>

      <Button href={`${frontendUrl}${ctaPath}`} style={buttonStyle}>
        {ctaLabel}
      </Button>

      <Text style={{ marginTop: "30px" }}>
        If you have any questions, reply to this email and our team will get back to you.
      </Text>
    </Layout>
  )
}
