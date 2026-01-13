import React from "react"
import { Body, Container, Head, Html, Img } from "@react-email/components"

interface LayoutProps {
  children?: React.ReactNode
  preview?: string
}

const bodyStyle = {
  backgroundColor: "#f5f6f8",
  margin: 0,
  padding: 0,
  fontFamily: "Arial, sans-serif",
}

const containerStyle = {
  maxWidth: "600px",
  margin: "0 auto",
}

const headerStyle = {
  background: "#1a1a1a",
  padding: "30px 20px",
  textAlign: "center" as const,
}

const contentStyle = {
  padding: "30px 20px",
  background: "#ffffff",
}

const footerStyle = {
  textAlign: "center" as const,
  padding: "20px",
  background: "#f5f5f5",
  color: "#666",
  fontSize: "12px",
}

export function Layout({ children, preview }: LayoutProps) {
  const logoUrl =
    process.env.LOGO_URL || "https://play14.org/logo/play14_600x200_transparent-dark.png"

  return (
    <Html>
      <Head />
      {preview && <span style={{ display: "none" }}>{preview}</span>}
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <div style={headerStyle}>
            <Img src={logoUrl} alt="#play14" width={200} />
          </div>
          <div style={contentStyle}>{children}</div>
          <div style={footerStyle}>
            <p>The #play14 Team</p>
            <p>
              <a href="https://play14.org" style={{ color: "#f47920" }}>
                play14.org
              </a>
            </p>
          </div>
        </Container>
      </Body>
    </Html>
  )
}
