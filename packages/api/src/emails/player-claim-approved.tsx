import React from "react"
import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface PlayerClaimApprovedEmailProps {
  playerName: string
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

export default function PlayerClaimApprovedEmail({
  playerName,
  frontendUrl = "https://play14.org",
}: PlayerClaimApprovedEmailProps) {
  return (
    <Layout preview="Your Player Profile Has Been Linked!">
      <Heading as="h2">Welcome to #play14!</Heading>
      <Text>
        Great news! Your claim to the player profile "<strong>{playerName}</strong>" has been
        approved.
      </Text>

      <Text>You can now access the admin panel and update your profile.</Text>

      <Button href={`${frontendUrl}/admin/profile`} style={buttonStyle}>
        View Your Profile
      </Button>

      <Text style={{ marginTop: "30px" }}>Welcome to the #play14 community!</Text>

      <Text style={{ marginTop: "30px", color: "#666", fontSize: "12px" }}>
        This email was sent automatically by the #play14 community platform.
      </Text>
    </Layout>
  )
}
