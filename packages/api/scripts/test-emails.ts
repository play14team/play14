/**
 * Test script to send all email templates to a test email address
 * Run with: bun run scripts/test-emails.ts
 */

import { render } from "@react-email/render"
import { compileStrapi, createStrapi } from "@strapi/strapi"

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
import { sendEmail } from "../src/services/email-send"

const TEST_EMAIL = "cedric.pontet+test@gmail.com"
const FRONTEND_URL = "https://play14.org"

async function sendTestEmails() {
  console.log("🚀 Starting email template testing...")
  console.log(`📧 Sending all emails to: ${TEST_EMAIL}\n`)

  // Initialize Strapi.
  //
  // Strapi 5's config-loader only accepts .js / .json — running this script
  // directly against the source tree would surface "Config file not loaded"
  // for every config/*.ts. compileStrapi() runs the same TS compile that
  // `strapi develop` does, then returns { appDir, distDir } so createStrapi
  // reads its config from dist/. This is the canonical scripting pattern.
  const { appDir, distDir } = await compileStrapi()
  const strapi = await createStrapi({ appDir, distDir }).load()

  try {
    // 1. Player Claim New (to admins)
    console.log("1️⃣  Sending: Player Claim New (Admin Notification)")
    const html1 = await render(
      PlayerClaimNewEmail({
        userEmail: "john.doe@example.com",
        username: "johndoe",
        provider: "google",
        playerName: "John Doe",
        playerPosition: "Facilitator",
        reason:
          "I am the same person as this player profile. I facilitated at #play14 Luxembourg in 2023.",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text1 = await render(
      PlayerClaimNewEmail({
        userEmail: "john.doe@example.com",
        username: "johndoe",
        provider: "google",
        playerName: "John Doe",
        playerPosition: "Facilitator",
        reason:
          "I am the same person as this player profile. I facilitated at #play14 Luxembourg in 2023.",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "player_claim_request", {
      to: TEST_EMAIL,
      subject: "[TEST 1/11] New Player Claim Request",
      html: html1,
      text: text1,
    })
    console.log("   ✅ Sent!\n")

    // 2. Player Claim Approved
    console.log("2️⃣  Sending: Player Claim Approved")
    const html2 = await render(
      PlayerClaimApprovedEmail({
        playerName: "John Doe",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text2 = await render(
      PlayerClaimApprovedEmail({
        playerName: "John Doe",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "player_claim_decision", {
      to: TEST_EMAIL,
      subject: "[TEST 2/11] Your Player Profile Has Been Linked!",
      html: html2,
      text: text2,
    })
    console.log("   ✅ Sent!\n")

    // 3. Player Claim Rejected
    console.log("3️⃣  Sending: Player Claim Rejected")
    const html3 = await render(
      PlayerClaimRejectedEmail({
        playerName: "John Doe",
        adminNotes:
          "We need more information to verify your identity. Please provide additional details or contact us directly.",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text3 = await render(
      PlayerClaimRejectedEmail({
        playerName: "John Doe",
        adminNotes:
          "We need more information to verify your identity. Please provide additional details or contact us directly.",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "player_claim_decision", {
      to: TEST_EMAIL,
      subject: "[TEST 3/11] Player Claim Update",
      html: html3,
      text: text3,
    })
    console.log("   ✅ Sent!\n")

    // 4. Attendance Claim New (to organizers)
    console.log("4️⃣  Sending: Attendance Claim New (Organizer Notification)")
    const html4 = await render(
      AttendanceClaimNewEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerName: "Jane Smith",
        playerPosition: "Player",
        reason:
          "I attended this event and participated in several game sessions. I would like this to be reflected on my profile.",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text4 = await render(
      AttendanceClaimNewEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerName: "Jane Smith",
        playerPosition: "Player",
        reason:
          "I attended this event and participated in several game sessions. I would like this to be reflected on my profile.",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "attendance_claim_request", {
      to: TEST_EMAIL,
      subject: "[TEST 4/11] New Attendance Claim for #play14 Luxembourg 2024",
      html: html4,
      text: text4,
    })
    console.log("   ✅ Sent!\n")

    // 5. Attendance Claim Approved
    console.log("5️⃣  Sending: Attendance Claim Approved")
    const html5 = await render(
      AttendanceClaimApprovedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerSlug: "jane-smith",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text5 = await render(
      AttendanceClaimApprovedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        playerSlug: "jane-smith",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "attendance_claim_decision", {
      to: TEST_EMAIL,
      subject: "[TEST 5/11] Your Attendance Claim Has Been Approved!",
      html: html5,
      text: text5,
    })
    console.log("   ✅ Sent!\n")

    // 6. Attendance Claim Rejected
    console.log("6️⃣  Sending: Attendance Claim Rejected")
    const html6 = await render(
      AttendanceClaimRejectedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        adminNotes:
          "We don't have a record of your attendance at this event. Please contact the organizers directly if you believe this is an error.",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text6 = await render(
      AttendanceClaimRejectedEmail({
        eventName: "#play14 Luxembourg 2024",
        eventDate: "October 24, 2024",
        locationName: "Luxembourg City",
        adminNotes:
          "We don't have a record of your attendance at this event. Please contact the organizers directly if you believe this is an error.",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "attendance_claim_decision", {
      to: TEST_EMAIL,
      subject: "[TEST 6/11] Attendance Claim Update",
      html: html6,
      text: text6,
    })
    console.log("   ✅ Sent!\n")

    // 7. Ticket Confirmation
    console.log("7️⃣  Sending: Ticket Confirmation")
    const html7 = await render(
      TicketConfirmationEmail({
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
      })
    )
    const text7 = await render(
      TicketConfirmationEmail({
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
      { plainText: true }
    )
    await sendEmail(strapi, "confirmation", {
      to: TEST_EMAIL,
      subject: "[TEST 7/11] Your tickets for #play14 Luxembourg 2025",
      html: html7,
      text: text7,
    })
    console.log("   ✅ Sent!\n")

    // 8. Ticket Order Refund
    console.log("8️⃣  Sending: Ticket Order Refund")
    const html8 = await render(
      TicketOrderRefundEmail({
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
      })
    )
    const text8 = await render(
      TicketOrderRefundEmail({
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
      { plainText: true }
    )
    await sendEmail(strapi, "ticket_refund", {
      to: TEST_EMAIL,
      subject: "[TEST 8/11] Your order has been refunded",
      html: html8,
      text: text8,
    })
    console.log("   ✅ Sent!\n")

    // 9. Player Invitation
    console.log("9️⃣  Sending: Player Invitation")
    const html9 = await render(
      PlayerInvitationEmail({
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
      })
    )
    const text9 = await render(
      PlayerInvitationEmail({
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
      { plainText: true }
    )
    await sendEmail(strapi, "player_invitation", {
      to: TEST_EMAIL,
      subject: "[TEST 9/11] Your ticket for #play14 Luxembourg 2025 - Create your profile",
      html: html9,
      text: text9,
    })
    console.log("   ✅ Sent!\n")

    // 10. Payment Failed
    console.log("🔟 Sending: Payment Failed")
    const html10 = await render(
      PaymentFailedEmail({
        orderNumber: "ORD-2024-67890",
        eventName: "#play14 Luxembourg 2025",
        eventSlug: "play14-luxembourg-2025",
        errorMessage: "Your card was declined. Please check your card details and try again.",
        frontendUrl: FRONTEND_URL,
      })
    )
    const text10 = await render(
      PaymentFailedEmail({
        orderNumber: "ORD-2024-67890",
        eventName: "#play14 Luxembourg 2025",
        eventSlug: "play14-luxembourg-2025",
        errorMessage: "Your card was declined. Please check your card details and try again.",
        frontendUrl: FRONTEND_URL,
      }),
      { plainText: true }
    )
    await sendEmail(strapi, "payment_failed", {
      to: TEST_EMAIL,
      subject: "[TEST 10/11] Payment failed for #play14 Luxembourg 2025",
      html: html10,
      text: text10,
    })
    console.log("   ✅ Sent!\n")

    // 11. Ticket Sold Notification
    console.log("11️⃣  Sending: Ticket Sold Notification (Organizer)")
    const html11 = await render(
      TicketSoldNotificationEmail({
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
      })
    )
    const text11 = await render(
      TicketSoldNotificationEmail({
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
      { plainText: true }
    )
    await sendEmail(strapi, "ticket_sold", {
      to: TEST_EMAIL,
      subject: "[TEST 11/11] New ticket order for #play14 Luxembourg 2025",
      html: html11,
      text: text11,
    })
    console.log("   ✅ Sent!\n")

    console.log("✅ All 11 test emails sent successfully!")
    console.log(`📧 Check your inbox at: ${TEST_EMAIL}`)
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
    console.log("   11. Ticket Sold Notification (Organizer)")
  } catch (error) {
    console.error("❌ Error sending test emails:", error)
    throw error
  } finally {
    // Close Strapi connection
    await strapi.destroy()
  }
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
