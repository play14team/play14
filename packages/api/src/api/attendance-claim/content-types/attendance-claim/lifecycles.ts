/**
 * Lifecycle hooks for attendance-claim content type
 * Handles email notifications on claim events
 */

import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import AttendanceClaimApprovedEmail from "../../../../emails/attendance-claim-approved"
import AttendanceClaimNewEmail from "../../../../emails/attendance-claim-new"
import AttendanceClaimRejectedEmail from "../../../../emails/attendance-claim-rejected"

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

    if (!claim?.player || !claim.event) {
      strapi.log.warn("[AttendanceClaim] Could not send email: claim data incomplete")
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
      const html = await render(
        AttendanceClaimNewEmail({
          eventName: claim.event.name,
          eventDate,
          locationName: claim.event.location?.name || "N/A",
          playerName: claim.player.name,
          playerPosition: claim.player.position,
          reason: claim.reason,
          frontendUrl,
        })
      )

      const text = await render(
        AttendanceClaimNewEmail({
          eventName: claim.event.name,
          eventDate,
          locationName: claim.event.location?.name || "N/A",
          playerName: claim.player.name,
          playerPosition: claim.player.position,
          reason: claim.reason,
          frontendUrl,
        }),
        { plainText: true }
      )

      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: Array.from(organizerEmails),
          subject: `[#play14] New Attendance Claim for ${claim.event.name}`,
          html,
          text,
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

    if (!claim?.player || !claim.event) {
      strapi.log.warn("[AttendanceClaim] Could not send email: data incomplete")
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
        const html = await render(
          AttendanceClaimApprovedEmail({
            eventName: claim.event.name,
            eventDate,
            locationName: claim.event.location?.name || "N/A",
            playerSlug: claim.player.slug,
            frontendUrl,
          })
        )

        const text = await render(
          AttendanceClaimApprovedEmail({
            eventName: claim.event.name,
            eventDate,
            locationName: claim.event.location?.name || "N/A",
            playerSlug: claim.player.slug,
            frontendUrl,
          }),
          { plainText: true }
        )

        await strapi.plugin("email").service("email").send({
          to: playerEmail,
          subject: "[#play14] Your Attendance Claim Has Been Approved!",
          html,
          text,
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
        const html = await render(
          AttendanceClaimRejectedEmail({
            eventName: claim.event.name,
            eventDate,
            locationName: claim.event.location?.name || "N/A",
            adminNotes: result.adminNotes,
            frontendUrl,
          })
        )

        const text = await render(
          AttendanceClaimRejectedEmail({
            eventName: claim.event.name,
            eventDate,
            locationName: claim.event.location?.name || "N/A",
            adminNotes: result.adminNotes,
            frontendUrl,
          }),
          { plainText: true }
        )

        await strapi.plugin("email").service("email").send({
          to: playerEmail,
          subject: "[#play14] Attendance Claim Update",
          html,
          text,
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
