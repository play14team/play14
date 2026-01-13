import React from "react"
import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface PlayerClaimRejectedEmailProps {
  playerName: string
  adminNotes?: string
  frontendUrl?: string
}

const buttonStyle = {
  backgroundColor: "#2196F3",
  color: "#ffffff",
  padding: "10px 20px",
  textDecoration: "none",
  borderRadius: "5px",
  display: "inline-block",
}

const reasonBoxStyle = {
  background: "#f5f5f5",
  padding: "10px",
  borderRadius: "5px",
  margin: "10px 0",
}

export default function PlayerClaimRejectedEmail({
  playerName,
  adminNotes,
  frontendUrl = "https://play14.org",
}: PlayerClaimRejectedEmailProps) {
  return (
    <Layout preview="Player Claim Update">
      <Heading as="h2">Player Claim Update</Heading>
      <Text>
        Unfortunately, your claim to the player profile "<strong>{playerName}</strong>" could not be
        approved.
      </Text>

      {adminNotes && (
        <>
          <Heading as="h3">Reason:</Heading>
          <div style={reasonBoxStyle}>
            <Text>{adminNotes}</Text>
          </div>
        </>
      )}

      <Text>If you believe this is an error, please contact us or try claiming a different profile.</Text>

      <Button href={`${frontendUrl}/contact`} style={buttonStyle}>
        Contact Us
      </Button>

      <Text style={{ marginTop: "30px", color: "#666", fontSize: "12px" }}>
        This email was sent automatically by the #play14 community platform.
      </Text>
    </Layout>
  )
}
