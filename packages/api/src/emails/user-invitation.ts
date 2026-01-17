import React from "react"
import { Body, Button, Container, Head, Html, Link, Preview, Text } from "@react-email/components"

interface UserInvitationEmailProps {
  name?: string
  inviteUrl: string
  reminder?: boolean
  supportEmail?: string
  customMessage?: string
}

const containerStyle = {
  margin: "0 auto",
  padding: "24px",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  fontFamily: "Arial, sans-serif",
  color: "#222222",
}

const brandOrange = "#ff5200"

const buttonStyle = {
  backgroundColor: brandOrange,
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
}

const lightBodyStyle = {
  backgroundColor: "#f5f6f8",
  margin: 0,
  padding: 0,
}

const mutedTextStyle = {
  fontSize: "14px",
  color: "#555555",
}

const linkStyle = {
  color: brandOrange,
}

const customMessageStyle = {
  backgroundColor: "#f8f9fa",
  padding: "16px",
  borderRadius: "8px",
  borderLeft: `4px solid ${brandOrange}`,
  marginBottom: "16px",
  fontStyle: "italic",
}

export default function UserInvitationEmail({
  name,
  inviteUrl,
  reminder = false,
  supportEmail = "community@play14.org",
  customMessage,
}: UserInvitationEmailProps) {
  const greeting = name ? `Hi ${name},` : "Hi,"
  const previewText = reminder
    ? "Reminder: your #play14 account is waiting."
    : "Your #play14 account is ready."

  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(Preview, null, previewText),
    React.createElement(
      Body,
      { style: lightBodyStyle },
      React.createElement(
        Container,
        { style: containerStyle },
        React.createElement(Text, { style: { fontSize: "18px", fontWeight: "bold" } }, greeting),
        customMessage
          ? React.createElement(Text, { style: customMessageStyle }, customMessage)
          : null,
        React.createElement(
          Text,
          null,
          reminder
            ? "Just a quick reminder to activate your #play14 account."
            : "Your #play14 account is ready."
        ),
        React.createElement(
          Text,
          null,
          "Use the button below to set your password and sign in. For later sign-in, if you prefer, you can use LinkedIn, Google, ",
          "GitHub, or Microsoft as long as the provider uses the same email address that received this invite. You can also continue ",
          "to sign in with your email after setting a password."
        ),
        React.createElement(Button, { style: buttonStyle, href: inviteUrl }, "Set your password"),
        React.createElement(
          Text,
          { style: mutedTextStyle },
          "If the button does not work, copy and paste this link:",
          React.createElement("br", null),
          React.createElement(Link, { href: inviteUrl, style: linkStyle }, inviteUrl)
        ),
        React.createElement(
          Text,
          { style: mutedTextStyle },
          "Need help? Reply to this email or contact ",
          React.createElement(
            Link,
            { href: `mailto:${supportEmail}`, style: linkStyle },
            supportEmail
          ),
          "."
        )
      )
    )
  )
}
