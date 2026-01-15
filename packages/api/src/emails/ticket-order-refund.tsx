import React from "react"
import { Button, Heading, Text } from "@react-email/components"
import { Layout } from "./components/layout"

interface TicketOrderRefundEmailProps {
  orderNumber: string
  eventName: string
  currency: string
  totalAmount: number
  refundAmount: number
  refundReason?: string
  isPartialRefund: boolean
  tickets: Array<{
    ticketTypeName: string
    ticketCode: string
  }>
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
}

const refundNoticeStyle = {
  background: "#fff3cd",
  border: "1px solid #ffc107",
  padding: "15px",
  borderRadius: "5px",
  margin: "15px 0",
}

const ticketsBoxStyle = {
  background: "white",
  padding: "15px",
  borderRadius: "5px",
  margin: "15px 0",
}

const codeStyle = {
  background: "#eee",
  padding: "2px 6px",
  borderRadius: "3px",
  fontFamily: "monospace",
}

export default function TicketOrderRefundEmail({
  orderNumber,
  eventName,
  currency,
  totalAmount,
  refundAmount,
  refundReason,
  isPartialRefund,
  tickets,
  frontendUrl = "https://play14.org",
}: TicketOrderRefundEmailProps) {
  return (
    <Layout preview={`Your order has been ${isPartialRefund ? "partially " : ""}refunded`}>
      <Heading as="h2">Your order has been {isPartialRefund ? "partially " : ""}refunded</Heading>

      <div style={refundNoticeStyle}>
        <Text style={{ margin: "5px 0" }}>
          <strong>Order:</strong> {orderNumber}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Event:</strong> {eventName}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Original Amount:</strong> {currency} {totalAmount.toFixed(2)}
        </Text>
        <Text style={{ margin: "5px 0" }}>
          <strong>Refunded Amount:</strong> {currency} {refundAmount.toFixed(2)}
        </Text>
        {refundReason && (
          <Text style={{ margin: "5px 0" }}>
            <strong>Reason:</strong> {refundReason}
          </Text>
        )}
      </div>

      <div style={ticketsBoxStyle}>
        <Heading as="h3">Affected Tickets</Heading>
        {tickets.map((ticket, index) => (
          <Text key={index} style={{ margin: "8px 0" }}>
            <strong>{ticket.ticketTypeName}:</strong>{" "}
            <span style={codeStyle}>{ticket.ticketCode}</span>
          </Text>
        ))}
      </div>

      <Text>
        {isPartialRefund
          ? "Some of your tickets may still be valid. Please check your account for details."
          : "Your tickets have been cancelled and are no longer valid for entry."}
      </Text>

      <Button href={`${frontendUrl}/admin/orders`} style={buttonStyle}>
        View Your Orders
      </Button>

      <Text style={{ marginTop: "30px" }}>If you have any questions, please contact the event organizers.</Text>
    </Layout>
  )
}
