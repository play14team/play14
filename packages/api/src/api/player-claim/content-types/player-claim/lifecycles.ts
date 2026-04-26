/**
 * Lifecycle hooks for player-claim content type
 * Handles email notifications on claim events
 */

import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import PlayerClaimNewEmail from "../../../../emails/player-claim-new"
import { sendEmail } from "../../../../services/email-send"

// Get environment variables for email config
const getAdminRecipients = (): string[] => {
  const recipients = process.env.EMAIL_ADMIN_RECIPIENTS || ""
  return recipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
}

const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || "https://play14.org"
}

export default {
  async afterCreate(event: { result: any; params: any }) {
    const { result } = event

    // Get strapi instance
    const strapi = (global as any).strapi as Core.Strapi

    // Populate the claim with user and player data
    const claim = await strapi.documents("api::player-claim.player-claim").findOne({
      documentId: result.documentId,
      populate: {
        user: {
          fields: ["id", "username", "email", "provider"],
        },
        player: {
          fields: ["documentId", "name", "slug", "position"],
        },
      },
    })

    if (!claim?.user || !claim.player) {
      strapi.log.warn("[PlayerClaim] Could not send email: claim data incomplete")
      return
    }

    const adminRecipients = getAdminRecipients()
    if (adminRecipients.length === 0) {
      strapi.log.warn("[PlayerClaim] No admin recipients configured for email notifications")
      return
    }

    const frontendUrl = getFrontendUrl()

    // Send email to admins
    try {
      const html = await render(
        PlayerClaimNewEmail({
          userEmail: claim.user.email,
          username: claim.user.username,
          provider: claim.user.provider,
          playerName: claim.player.name,
          playerPosition: claim.player.position,
          reason: claim.reason,
          frontendUrl,
        })
      )

      const text = await render(
        PlayerClaimNewEmail({
          userEmail: claim.user.email,
          username: claim.user.username,
          provider: claim.user.provider,
          playerName: claim.player.name,
          playerPosition: claim.player.position,
          reason: claim.reason,
          frontendUrl,
        }),
        { plainText: true }
      )

      await sendEmail(strapi, "player_claim_request", {
        to: adminRecipients,
        subject: "[#play14] New Player Claim Request",
        html,
        text,
      })

      strapi.log.info(
        `[PlayerClaim] Sent notification email to admins for claim ${result.documentId}`
      )
    } catch (error) {
      strapi.log.error(`[PlayerClaim] Failed to send admin notification email: ${error}`)
    }
  },

  async afterUpdate(event: { result: any; params: any }) {
    const { result } = event

    // Get strapi instance
    const strapi = (global as any).strapi as Core.Strapi

    // Check if claimStatus was updated (email notifications only)
    // Note: The actual linking logic is handled by Document Service Middleware in src/index.ts
    const newStatus = result.claimStatus
    if (!newStatus || (newStatus !== "approved" && newStatus !== "rejected")) {
      return
    }

    // Populate the claim with user and player data for email
    const claim = await strapi.documents("api::player-claim.player-claim").findOne({
      documentId: result.documentId,
      populate: {
        user: {
          fields: ["id", "username", "email"],
        },
        player: {
          fields: ["documentId", "name", "slug"],
        },
      },
    })

    if (!claim?.user || !claim.player) {
      strapi.log.warn("[PlayerClaim] Could not send email: data incomplete")
      return
    }

    const frontendUrl = getFrontendUrl()

    if (newStatus === "approved") {
      // Send approval email to user
      try {
        const PlayerClaimApprovedEmail = (await import("../../../../emails/player-claim-approved"))
          .default

        const html = await render(
          PlayerClaimApprovedEmail({
            playerName: claim.player.name,
            frontendUrl,
          })
        )

        const text = await render(
          PlayerClaimApprovedEmail({
            playerName: claim.player.name,
            frontendUrl,
          }),
          { plainText: true }
        )

        await sendEmail(strapi, "player_claim_decision", {
          to: claim.user.email,
          subject: "[#play14] Your Player Profile Has Been Linked!",
          html,
          text,
        })

        strapi.log.info(
          `[PlayerClaim] Sent approval email to ${claim.user.email} for claim ${result.documentId}`
        )
      } catch (error) {
        strapi.log.error(`[PlayerClaim] Failed to send approval email: ${error}`)
      }
    } else if (newStatus === "rejected") {
      // Send rejection email to user
      try {
        const PlayerClaimRejectedEmail = (await import("../../../../emails/player-claim-rejected"))
          .default

        const html = await render(
          PlayerClaimRejectedEmail({
            playerName: claim.player.name,
            adminNotes: result.adminNotes,
            frontendUrl,
          })
        )

        const text = await render(
          PlayerClaimRejectedEmail({
            playerName: claim.player.name,
            adminNotes: result.adminNotes,
            frontendUrl,
          }),
          { plainText: true }
        )

        await sendEmail(strapi, "player_claim_decision", {
          to: claim.user.email,
          subject: "[#play14] Player Claim Update",
          html,
          text,
        })

        strapi.log.info(
          `[PlayerClaim] Sent rejection email to ${claim.user.email} for claim ${result.documentId}`
        )
      } catch (error) {
        strapi.log.error(`[PlayerClaim] Failed to send rejection email: ${error}`)
      }
    }
  },
}
