/**
 * Simple test script to send all email templates using Resend directly
 * Run with: RESEND_API_KEY=your_key bun run scripts/test-emails-simple.ts
 *
 * Make sure to set your RESEND_API_KEY environment variable
 */

import { render } from "@react-email/render"
import { Resend } from "resend"

// Import all email templates
import PlayerClaimNewEmail from "../src/emails/player-claim-new"
import PlayerClaimApprovedEmail from "../src/emails/player-claim-approved"
import PlayerClaimRejectedEmail from "../src/emails/player-claim-rejected"
import AttendanceClaimNewEmail from "../src/emails/attendance-claim-new"
import AttendanceClaimApprovedEmail from "../src/emails/attendance-claim-approved"
import AttendanceClaimRejectedEmail from "../src/emails/attendance-claim-rejected"
import TicketConfirmationEmail from "../src/emails/ticket-confirmation"
import TicketOrderRefundEmail from "../src/emails/ticket-order-refund"
import PlayerInvitationEmail from "../src/emails/player-invitation"
import PaymentFailedEmail from "../src/emails/payment-failed"

const TEST_EMAIL = "cedric.pontet+test@gmail.com"
const FRONTEND_URL = "https://play14.org"
const FROM_EMAIL = process.env.RESEND_DEFAULT_FROM || "onboarding@resend.dev"

// Check for API key
if (!process.env.RESEND_API_KEY) {
  console.error("❌ Error: RESEND_API_KEY environment variable is required")
  console.error("   Set it with: export RESEND_API_KEY=your_key")
  process.exit(1)
}

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendTestEmails() {
  console.log("🚀 Starting email template testing...")
  console.log(`📧 Sending all emails to: ${TEST_EMAIL}`)
  console.log(`📤 From: ${FROM_EMAIL}\n`)

  const emails = [
    {
      name: "Player Claim New (Admin Notification)",
      subject: "[TEST 1/10] New Player Claim Request",
      component: PlayerClaimNewEmail({
        userEmail: "john.doe@example.com",
        username: "johndoe",
        provider: "google",
        playerName: "John Doe",
        playerPosition: "Facilitator",
        reason: "I am the same person as this player profile. I facilitated at #play14 Luxembourg in 2023.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Player Claim Approved",
      subject: "[TEST 2/10] Your Player Profile Has Been Linked!",
      component: PlayerClaimApprovedEmail({
        playerName: "John Doe",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Player Claim Rejected",
      subject: "[TEST 3/10] Player Claim Update",
      component: PlayerClaimRejectedEmail({
        playerName: "John Doe",
        adminNotes: "We need more information to verify your identity. Please provide additional details or contact us directly.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Attendance Claim New (Organizer Notification)",
      subject: "[TEST 4/10] New Attendance Claim for #play14 Luxembourg 2024",
      component: AttendanceClaimNewEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerName: "Jane Smith",
        playerPosition: "Player",
        reason: "I attended this event and participated in several game sessions. I would like this to be reflected on my profile.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Attendance Claim Approved",
      subject: "[TEST 5/10] Your Attendance Claim Has Been Approved!",
      component: AttendanceClaimApprovedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerSlug: "jane-smith",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Attendance Claim Rejected",
      subject: "[TEST 6/10] Attendance Claim Update",
      component: AttendanceClaimRejectedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        adminNotes: "We don't have a record of your attendance at this event. Please contact the organizers directly if you believe this is an error.",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Ticket Confirmation",
      subject: "[TEST 7/10] Your tickets for #play14 Luxembourg 2025",
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
        googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=%23play14+Luxembourg+2025",
        outlookCalendarUrl: "https://outlook.live.com/calendar/0/deeplink/compose?subject=%23play14+Luxembourg+2025",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Ticket Order Refund",
      subject: "[TEST 8/10] Your order has been refunded",
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
      name: "Player Invitation",
      subject: "[TEST 9/10] Your ticket for #play14 Luxembourg 2025 - Create your profile",
      component: PlayerInvitationEmail({
        playerName: "Charlie Brown",
        ticketCode: "TKT-INV-003-DEF456",
        eventName: "#play14 Luxembourg 2025",
        eventDate: "Friday, March 21, 2025",
        eventTime: "09:00 AM",
        eventLocation: "Innovation Hub, Luxembourg City",
        claimUrl: `${FRONTEND_URL}/auth/register?claim=abc123def456`,
        googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=%23play14+Luxembourg+2025",
        outlookCalendarUrl: "https://outlook.live.com/calendar/0/deeplink/compose?subject=%23play14+Luxembourg+2025",
        frontendUrl: FRONTEND_URL,
      }),
    },
    {
      name: "Payment Failed",
      subject: "[TEST 10/10] Payment failed for #play14 Luxembourg 2025",
      component: PaymentFailedEmail({
        orderNumber: "ORD-2024-67890",
        eventName: "#play14 Luxembourg 2025",
        eventSlug: "play14-luxembourg-2025",
        errorMessage: "Your card was declined. Please check your card details and try again.",
        frontendUrl: FRONTEND_URL,
      }),
    },
  ]

  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < emails.length; i++) {
    const { name, subject, component } = emails[i]
    console.log(`${i + 1}️⃣  Sending: ${name}`)

    try {
      const html = await render(component)
      const text = await render(component, { plainText: true })

      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: TEST_EMAIL,
        subject,
        html,
        text,
      })

      if (result.data) {
        console.log(`   ✅ Sent! (ID: ${result.data.id})`)
        successCount++
      } else {
        console.log(`   ❌ Failed: ${result.error?.message || "Unknown error"}`)
        failedCount++
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`)
      failedCount++
    }

    // Add a small delay between emails to avoid rate limiting
    if (i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log("")
  }

  console.log("📊 Summary:")
  console.log(`   ✅ Successfully sent: ${successCount}/10`)
  if (failedCount > 0) {
    console.log(`   ❌ Failed: ${failedCount}/10`)
  }
  console.log(`\n📧 Check your inbox at: ${TEST_EMAIL}`)
  console.log("\n📋 Email Templates Tested:")
  console.log("   1. Player Claim New (Admin)")
  console.log("   2. Player Claim Approved")
  console.log("   3. Player Claim Rejected")
  console.log("   4. Attendance Claim New (Organizer)")
  console.log("   5. Attendance Claim Approved")
  console.log("   6. Attendance Claim Rejected")
  console.log("   7. Ticket Confirmation")
  console.log("   8. Ticket Order Refund")
  console.log("   9. Player Invitation")
  console.log("   10. Payment Failed")
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
