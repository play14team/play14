import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface PlayerClaimNewEmailProps {
  userEmail: string
  username: string
  provider: string
  playerName: string
  playerPosition: string
  reason: string
  frontendUrl?: string
}

const _brandOrange = "#ff5200"

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

export default function PlayerClaimNewEmail({
  userEmail,
  username,
  provider,
  playerName,
  playerPosition,
  reason,
  frontendUrl = "https://play14.org",
}: PlayerClaimNewEmailProps) {
  return (
    <Layout preview="New player claim request">
      <Heading as="h2">New Player Claim Request</Heading>
      <Text>A new player claim request has been submitted and requires your review.</Text>

      <Heading as="h3">Details:</Heading>
      <div style={detailsBoxStyle}>
        <Text style={{ margin: "5px 0" }}>
          <strong>User Email:</strong> {userEmail}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>User Name:</strong> {username}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>OAuth Provider:</strong> {provider}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Claiming Player:</strong> {playerName}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Player Position:</strong> {playerPosition}
        </Text>
      </div>

      <Heading as="h3">Reason Provided:</Heading>
      <div style={detailsBoxStyle}>
        <Text>{reason}</Text>
      </div>

      <Button href={`${frontendUrl}/admin/claims`} style={buttonStyle}>
        Review Claims
      </Button>

      <Text style={{ marginTop: "30px", color: "#666", fontSize: "12px" }}>
        This email was sent automatically by the #play14 community platform.
      </Text>
    </Layout>
  )
}
