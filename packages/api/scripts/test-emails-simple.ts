/**
 * Simple test script to send all email templates using Sender.net directly
 * Run with: SENDER_API_KEY=your_key bun run scripts/test-emails-simple.ts
 * Filter: bun run scripts/test-emails-simple.ts -- --only=ticket-sold-notification
 *
 * Make sure to set your SENDER_API_KEY environment variable
 */

import { render } from "@react-email/render"

import AttendanceClaimApprovedEmail from "../src/emails/attendance-claim-approved"
import AttendanceClaimNewEmail from "../src/emails/attendance-claim-new"
import AttendanceClaimRejectedEmail from "../src/emails/attendance-claim-rejected"
import PaymentFailedEmail from "../src/emails/payment-failed"
import PlayerClaimApprovedEmail from "../src/emails/player-claim-approved"
// Import all email templates
import PlayerClaimNewEmail from "../src/emails/player-claim-new"
import PlayerClaimRejectedEmail from "../src/emails/player-claim-rejected"
import PlayerInvitationEmail from "../src/emails/player-invitation"
import TicketConfirmationEmail from "../src/emails/ticket-confirmation"
import TicketOrderRefundEmail from "../src/emails/ticket-order-refund"
import TicketSoldNotificationEmail from "../src/emails/ticket-sold-notification"

const TEST_EMAIL = "cedric.pontet+test@gmail.com"
const FRONTEND_URL = "https://play14.org"
const FROM_EMAIL = process.env.EMAIL_DEFAULT_FROM || "noreply@play14.org"
const args = process.argv.slice(2)
const onlyArg = args.find((arg) => arg.startsWith("--only="))?.split("=")[1]
const filterArg = onlyArg || args.find((arg) => !arg.startsWith("--"))
const emailFilter = filterArg || process.env.EMAIL_TEMPLATE || process.env.EMAIL_FILTER || ""

// Check for API key
if (!process.env.SENDER_API_KEY) {
  console.error("❌ Error: SENDER_API_KEY environment variable is required")
  console.error("   Set it with: export SENDER_API_KEY=your_key")
  process.exit(1)
}

const SENDER_API_KEY = process.env.SENDER_API_KEY

/**
 * Parse "Name <email>" format into { email, name } for Sender.net.
 * Sender.net requires from.name to always be present.
 */
function parseFromEmail(from: string): { email: string; name: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { email: from.trim(), name: "#play14 community" }
}

async function sendTestEmails() {
  console.log("🚀 Starting email template testing...")
  console.log(`📧 Sending emails to: ${TEST_EMAIL}`)
  console.log(`📤 From: ${FROM_EMAIL}\n`)

  const emails = [
    {
      id: "player-claim-new",
      name: "Player Claim New (Admin Notification)",
      subject: "New Player Claim Request",
      component: PlayerClaimNewEmail({
        userEmail: "john.doe@example.com",
        username: "johndoe",
        provider: "google",
        playerName: "John Doe",
        playerPosition: "Facilitator",
        reason:
          "I am the same person as this player profile. I facilitated at #play14 Luxembourg in 2023.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "player-claim-approved",
      name: "Player Claim Approved",
      subject: "Your Player Profile Has Been Linked!",
      component: PlayerClaimApprovedEmail({
        playerName: "John Doe",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "player-claim-rejected",
      name: "Player Claim Rejected",
      subject: "Player Claim Update",
      component: PlayerClaimRejectedEmail({
        playerName: "John Doe",
        adminNotes:
          "We need more information to verify your identity. Please provide additional details or contact us directly.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "attendance-claim-new",
      name: "Attendance Claim New (Organizer Notification)",
      subject: "New Attendance Claim for #play14 Luxembourg 2024",
      component: AttendanceClaimNewEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerName: "Jane Smith",
        playerPosition: "Player",
        reason:
          "I attended this event and participated in several game sessions. I would like this to be reflected on my profile.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "attendance-claim-approved",
      name: "Attendance Claim Approved",
      subject: "Your Attendance Claim Has Been Approved!",
      component: AttendanceClaimApprovedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerSlug: "jane-smith",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "attendance-claim-rejected",
      name: "Attendance Claim Rejected",
      subject: "Attendance Claim Update",
      component: AttendanceClaimRejectedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        adminNotes:
          "We don't have a record of your attendance at this event. Please contact the organizers directly if you believe this is an error.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "ticket-confirmation",
      name: "Ticket Confirmation",
      subject: "Your tickets for #play14 Luxembourg 2025",
      component: TicketConfirmationEmail({
        orderNumber: "ORD-2024-12345",
        eventName: "#play14 Luxembourg 2025",
        eventDate: "Friday, March 21, 2025",
        eventTime: "09:00 AM",
        eventLocation: "Innovation Hub, Luxembourg City",
        currency: "EUR",
        totalAmount: 150.0,
        contactEmail: "luxembourg@play14.org",
        tickets: [
          {
            ticketTypeName: "Early Bird Ticket",
            ticketCode: "TKT-EB-001-ABC123",
            attendeeName: "Alice Johnson",
          },
          {
            ticketTypeName: "Regular Ticket",
            ticketCode: "TKT-REG-002-XYZ789",
            attendeeName: "Bob Williams",
          },
        ],
        googleCalendarUrl:
          "https://calendar.google.com/calendar/render?action=TEMPLATE&text=%23play14+Luxembourg+2025",
        outlookCalendarUrl:
          "https://outlook.live.com/calendar/0/deeplink/compose?subject=%23play14+Luxembourg+2025",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "ticket-order-refund",
      name: "Ticket Order Refund",
      subject: "Your order has been refunded",
      component: TicketOrderRefundEmail({
        orderNumber: "ORD-2024-12345",
        eventName: "#play14 Luxembourg 2025",
        currency: "EUR",
        totalAmount: 150.0,
        refundAmount: 150.0,
        refundReason: "Event cancelled due to unforeseen circumstances",
        isPartialRefund: false,
        tickets: [
          {
            ticketTypeName: "Early Bird Ticket",
            ticketCode: "TKT-EB-001-ABC123",
          },
          {
            ticketTypeName: "Regular Ticket",
            ticketCode: "TKT-REG-002-XYZ789",
          },
        ],
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "player-invitation",
      name: "Player Invitation",
      subject: "Your ticket for #play14 Luxembourg 2025 - Create your profile",
      component: PlayerInvitationEmail({
        playerName: "Charlie Brown",
        ticketCode: "TKT-INV-003-DEF456",
        eventName: "#play14 Luxembourg 2025",
        eventDate: "Friday, March 21, 2025",
        eventTime: "09:00 AM",
        eventLocation: "Innovation Hub, Luxembourg City",
        resetPasswordUrl: `${FRONTEND_URL}/auth/reset-password?code=abc123def456&callbackUrl=${encodeURIComponent("/admin")}`,
        googleCalendarUrl:
          "https://calendar.google.com/calendar/render?action=TEMPLATE&text=%23play14+Luxembourg+2025",
        outlookCalendarUrl:
          "https://outlook.live.com/calendar/0/deeplink/compose?subject=%23play14+Luxembourg+2025",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "payment-failed",
      name: "Payment Failed",
      subject: "Payment failed for #play14 Luxembourg 2025",
      component: PaymentFailedEmail({
        orderNumber: "ORD-2024-67890",
        eventName: "#play14 Luxembourg 2025",
        eventSlug: "play14-luxembourg-2025",
        errorMessage: "Your card was declined. Please check your card details and try again.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      id: "ticket-sold-notification",
      name: "Ticket Sold Notification (Organizer)",
      subject: "New ticket order for #play14 Luxembourg 2025",
      component: TicketSoldNotificationEmail({
        eventName: "#play14 Luxembourg 2025",
        eventSlug: "play14-luxembourg-2025",
        orderNumber: "ORD-2024-77777",
        purchaserName: "Dana Organizer",
        purchaserEmail: "dana@example.com",
        currency: "EUR",
        totalAmount: 100.0,
        tickets: [
          {
            ticketTypeName: "Regular Ticket",
            attendeeName: "Alice Johnson",
            attendeeEmail: "alice@example.com",
          },
          {
            ticketTypeName: "Regular Ticket",
            attendeeName: "Bob Williams",
            attendeeEmail: "bob@example.com",
          },
        ],
        frontendUrl: FRONTEND_URL,
      }),
    },
  ]

  const normalizedFilter = emailFilter.trim().toLowerCase()
  const requestedFilters = normalizedFilter
    ? normalizedFilter
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const emailsToSend = requestedFilters.length
    ? emails.filter((email) =>
        requestedFilters.some(
          (filter) => email.id === filter || email.name.toLowerCase().includes(filter)
        )
      )
    : emails

  if (requestedFilters.length > 0 && emailsToSend.length === 0) {
    console.error("❌ Error: No email templates matched the filter.")
    console.error("Available templates:")
    for (const email of emails) console.error(`- ${email.id}`)
    process.exit(1)
  }
  if (requestedFilters.length > 0) {
    console.log(`🔎 Filter: ${requestedFilters.join(", ")}`)
  }

  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < emailsToSend.length; i++) {
    const { name, subject, component } = emailsToSend[i]
    const subjectPrefix = `[TEST ${i + 1}/${emailsToSend.length}]`
    console.log(`${i + 1}️⃣  Sending: ${name}`)

    try {
      const html = await render(component)
      const text = await render(component, { plainText: true })

      const response = await fetch("https://api.sender.net/v2/message/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDER_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          from: parseFromEmail(FROM_EMAIL),
          to: { email: TEST_EMAIL },
          subject: `${subjectPrefix} ${subject}`,
          html,
          text,
        }),
      })

      if (response.ok) {
        console.log(`   ✅ Sent!`)
        successCount++
      } else {
        const errorData = await response.text()
        console.log(`   ❌ Failed: ${errorData}`)
        failedCount++
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`)
      failedCount++
    }

    // Add a small delay between emails to avoid rate limiting
    if (i < emailsToSend.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log("")
  }

  console.log("📊 Summary:")
  console.log(`   ✅ Successfully sent: ${successCount}/${emailsToSend.length}`)
  if (failedCount > 0) {
    console.log(`   ❌ Failed: ${failedCount}/${emailsToSend.length}`)
  }
  console.log(`\n📧 Check your inbox at: ${TEST_EMAIL}`)
  console.log("\n📋 Email Templates Tested:")
  emailsToSend.forEach((email, index) => {
    console.log(`   ${index + 1}. ${email.name}`)
  })
}

// Run the test
sendTestEmails()
  .then(() => {
    console.log("\n🎉 Test completed successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error)
    process.exit(1)
  })
