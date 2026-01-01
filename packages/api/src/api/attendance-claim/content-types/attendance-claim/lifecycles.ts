/**
 * Lifecycle hooks for attendance-claim content type
 * Handles email notifications on claim events
 */

import type { Core } from "@strapi/strapi"

const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || "https://play14.org"
}

export default {
  async afterCreate(event: { result: any; params: any }) {
    const { result } = event

    // Get strapi instance
    const strapi = (global as any).strapi as Core.Strapi

    // Populate the claim with player and event data
    const claim = await strapi.documents("api::attendance-claim.attendance-claim").findOne({
      documentId: result.documentId,
      populate: {
        player: {
          fields: ["id", "documentId", "name", "slug", "position"],
          populate: {
            avatar: { fields: ["name", "url"] },
          },
        },
        event: {
          fields: ["id", "documentId", "name", "slug", "start", "end", "contactEmail"],
          populate: {
            hosts: {
              fields: ["id", "name"],
              populate: {
                user: { fields: ["email"] },
              },
            },
            mentors: {
              fields: ["id", "name"],
              populate: {
                user: { fields: ["email"] },
              },
            },
            location: { fields: ["name"] },
          },
        },
      },
    })

    if (!claim || !claim.player || !claim.event) {
      strapi.log.warn(`[AttendanceClaim] Could not send email: claim data incomplete`)
      return
    }

    // Collect organizer emails (hosts and mentors with linked users)
    const organizerEmails = new Set<string>()

    for (const host of claim.event.hosts || []) {
      if (host.user?.email) {
        organizerEmails.add(host.user.email)
      }
    }

    for (const mentor of claim.event.mentors || []) {
      if (mentor.user?.email) {
        organizerEmails.add(mentor.user.email)
      }
    }

    // Fallback to event contact email if no organizers have accounts
    if (organizerEmails.size === 0 && claim.event.contactEmail) {
      organizerEmails.add(claim.event.contactEmail)
    }

    if (organizerEmails.size === 0) {
      strapi.log.warn(`[AttendanceClaim] No organizer emails found for event ${claim.event.name}`)
      return
    }

    const frontendUrl = getFrontendUrl()
    const eventDate = new Date(claim.event.start).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Send email to organizers
    try {
      await strapi.plugin("email").service("email").send({
        to: Array.from(organizerEmails),
        subject: `[#play14] New Attendance Claim for ${claim.event.name}`,
        html: `
          <h2>New Attendance Claim Request</h2>
          <p>A player has submitted a claim to be listed as an attendee for your event.</p>

          <h3>Event Details:</h3>
          <ul>
            <li><strong>Event:</strong> ${claim.event.name}</li>
            <li><strong>Date:</strong> ${eventDate}</li>
            <li><strong>Location:</strong> ${claim.event.location?.name || "N/A"}</li>
          </ul>

          <h3>Claiming Player:</h3>
          <ul>
            <li><strong>Name:</strong> ${claim.player.name}</li>
            <li><strong>Position:</strong> ${claim.player.position}</li>
          </ul>

          <h3>Reason Provided:</h3>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${claim.reason}</p>

          <p>
            <a href="${frontendUrl}/admin/attendance-claims" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Review Attendance Claims
            </a>
          </p>

          <hr />
          <p style="color: #666; font-size: 12px;">
            This email was sent automatically by the #play14 community platform.
          </p>
        `,
        text: `
New Attendance Claim Request

A player has submitted a claim to be listed as an attendee for your event.

Event Details:
- Event: ${claim.event.name}
- Date: ${eventDate}
- Location: ${claim.event.location?.name || "N/A"}

Claiming Player:
- Name: ${claim.player.name}
- Position: ${claim.player.position}

Reason Provided:
${claim.reason}

Review attendance claims at: ${frontendUrl}/admin/attendance-claims
        `.trim(),
      })

      strapi.log.info(
        `[AttendanceClaim] Sent notification email to organizers for claim ${result.documentId}`
      )
    } catch (error) {
      strapi.log.error(`[AttendanceClaim] Failed to send organizer notification email: ${error}`)
    }
  },

  async afterUpdate(event: { result: any; params: any }) {
    const { result } = event

    // Get strapi instance
    const strapi = (global as any).strapi as Core.Strapi

    // Check if claimStatus was updated
    const newStatus = result.claimStatus
    if (!newStatus || (newStatus !== "approved" && newStatus !== "rejected")) {
      return
    }

    // Populate the claim with player and event data for email
    const claim = await strapi.documents("api::attendance-claim.attendance-claim").findOne({
      documentId: result.documentId,
      populate: {
        player: {
          fields: ["documentId", "name", "slug"],
          populate: {
            user: { fields: ["email"] },
          },
        },
        event: {
          fields: ["documentId", "name", "slug", "start"],
          populate: {
            location: { fields: ["name"] },
          },
        },
      },
    })

    if (!claim || !claim.player || !claim.event) {
      strapi.log.warn(`[AttendanceClaim] Could not send email: data incomplete`)
      return
    }

    // Get player's email
    const playerEmail = claim.player.user?.email
    if (!playerEmail) {
      strapi.log.warn(`[AttendanceClaim] Player ${claim.player.name} has no linked user email`)
      return
    }

    const frontendUrl = getFrontendUrl()
    const eventDate = new Date(claim.event.start).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    if (newStatus === "approved") {
      // Send approval email to player
      try {
        await strapi.plugin("email").service("email").send({
          to: playerEmail,
          subject: `[#play14] Your Attendance Claim Has Been Approved!`,
          html: `
            <h2>Attendance Claim Approved!</h2>
            <p>Great news! Your claim to be listed as an attendee for <strong>${claim.event.name}</strong> has been approved.</p>

            <h3>Event Details:</h3>
            <ul>
              <li><strong>Event:</strong> ${claim.event.name}</li>
              <li><strong>Date:</strong> ${eventDate}</li>
              <li><strong>Location:</strong> ${claim.event.location?.name || "N/A"}</li>
            </ul>

            <p>This event is now visible on your player profile.</p>

            <p>
              <a href="${frontendUrl}/players/${claim.player.slug}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Your Profile
              </a>
            </p>

            <hr />
            <p style="color: #666; font-size: 12px;">
              This email was sent automatically by the #play14 community platform.
            </p>
          `,
          text: `
Attendance Claim Approved!

Great news! Your claim to be listed as an attendee for "${claim.event.name}" has been approved.

Event Details:
- Event: ${claim.event.name}
- Date: ${eventDate}
- Location: ${claim.event.location?.name || "N/A"}

This event is now visible on your player profile.

View your profile at: ${frontendUrl}/players/${claim.player.slug}
          `.trim(),
        })

        strapi.log.info(
          `[AttendanceClaim] Sent approval email to ${playerEmail} for claim ${result.documentId}`
        )
      } catch (error) {
        strapi.log.error(`[AttendanceClaim] Failed to send approval email: ${error}`)
      }
    } else if (newStatus === "rejected") {
      // Send rejection email to player
      try {
        await strapi.plugin("email").service("email").send({
          to: playerEmail,
          subject: `[#play14] Attendance Claim Update`,
          html: `
            <h2>Attendance Claim Update</h2>
            <p>Unfortunately, your claim to be listed as an attendee for <strong>${claim.event.name}</strong> could not be approved.</p>

            <h3>Event Details:</h3>
            <ul>
              <li><strong>Event:</strong> ${claim.event.name}</li>
              <li><strong>Date:</strong> ${eventDate}</li>
              <li><strong>Location:</strong> ${claim.event.location?.name || "N/A"}</li>
            </ul>

            ${result.adminNotes ? `
            <h3>Reason:</h3>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${result.adminNotes}</p>
            ` : ""}

            <p>If you believe this is an error, please contact the event organizers directly.</p>

            <p>
              <a href="${frontendUrl}/contact" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Contact Us
              </a>
            </p>

            <hr />
            <p style="color: #666; font-size: 12px;">
              This email was sent automatically by the #play14 community platform.
            </p>
          `,
          text: `
Attendance Claim Update

Unfortunately, your claim to be listed as an attendee for "${claim.event.name}" could not be approved.

Event Details:
- Event: ${claim.event.name}
- Date: ${eventDate}
- Location: ${claim.event.location?.name || "N/A"}

${result.adminNotes ? `Reason: ${result.adminNotes}` : ""}

If you believe this is an error, please contact the event organizers directly.

Contact us at: ${frontendUrl}/contact
          `.trim(),
        })

        strapi.log.info(
          `[AttendanceClaim] Sent rejection email to ${playerEmail} for claim ${result.documentId}`
        )
      } catch (error) {
        strapi.log.error(`[AttendanceClaim] Failed to send rejection email: ${error}`)
      }
    }
  },
}
