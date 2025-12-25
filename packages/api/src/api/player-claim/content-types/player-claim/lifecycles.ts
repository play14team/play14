/**
 * Lifecycle hooks for player-claim content type
 * Handles email notifications on claim events
 */

import type { Core } from "@strapi/strapi"

// Get environment variables for email config
const getAdminRecipients = (): string[] => {
  const recipients = process.env.EMAIL_ADMIN_RECIPIENTS || ""
  return recipients.split(",").map((r) => r.trim()).filter(Boolean)
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

    if (!claim || !claim.user || !claim.player) {
      strapi.log.warn(`[PlayerClaim] Could not send email: claim data incomplete`)
      return
    }

    const adminRecipients = getAdminRecipients()
    if (adminRecipients.length === 0) {
      strapi.log.warn(`[PlayerClaim] No admin recipients configured for email notifications`)
      return
    }

    const frontendUrl = getFrontendUrl()

    // Send email to admins
    try {
      await strapi.plugin("email").service("email").send({
        to: adminRecipients,
        subject: `[#play14] New Player Claim Request`,
        html: `
          <h2>New Player Claim Request</h2>
          <p>A new player claim request has been submitted and requires your review.</p>

          <h3>Details:</h3>
          <ul>
            <li><strong>User Email:</strong> ${claim.user.email}</li>
            <li><strong>User Name:</strong> ${claim.user.username}</li>
            <li><strong>OAuth Provider:</strong> ${claim.user.provider}</li>
            <li><strong>Claiming Player:</strong> ${claim.player.name}</li>
            <li><strong>Player Position:</strong> ${claim.player.position}</li>
          </ul>

          <h3>Reason Provided:</h3>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${claim.reason}</p>

          <p>
            <a href="${frontendUrl}/admin/claims" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Review Claims
            </a>
          </p>

          <hr />
          <p style="color: #666; font-size: 12px;">
            This email was sent automatically by the #play14 community platform.
          </p>
        `,
        text: `
New Player Claim Request

A new player claim request has been submitted and requires your review.

Details:
- User Email: ${claim.user.email}
- User Name: ${claim.user.username}
- OAuth Provider: ${claim.user.provider}
- Claiming Player: ${claim.player.name}
- Player Position: ${claim.player.position}

Reason Provided:
${claim.reason}

Review claims at: ${frontendUrl}/admin/claims
        `.trim(),
      })

      strapi.log.info(`[PlayerClaim] Sent notification email to admins for claim ${result.documentId}`)
    } catch (error) {
      strapi.log.error(`[PlayerClaim] Failed to send admin notification email: ${error}`)
    }
  },

  async afterUpdate(event: { result: any; params: any }) {
    const { result, params } = event

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

    if (!claim || !claim.user || !claim.player) {
      strapi.log.warn(`[PlayerClaim] Could not send email: data incomplete`)
      return
    }

    const frontendUrl = getFrontendUrl()

    if (newStatus === "approved") {
      // Send approval email to user
      try {
        await strapi.plugin("email").service("email").send({
          to: claim.user.email,
          subject: `[#play14] Your Player Profile Has Been Linked!`,
          html: `
            <h2>Welcome to #play14!</h2>
            <p>Great news! Your claim to the player profile "<strong>${claim.player.name}</strong>" has been approved.</p>

            <p>You can now access the admin panel and update your profile.</p>

            <p>
              <a href="${frontendUrl}/admin/profile" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Your Profile
              </a>
            </p>

            <p>Welcome to the #play14 community!</p>

            <hr />
            <p style="color: #666; font-size: 12px;">
              This email was sent automatically by the #play14 community platform.
            </p>
          `,
          text: `
Welcome to #play14!

Great news! Your claim to the player profile "${claim.player.name}" has been approved.

You can now access the admin panel and update your profile at:
${frontendUrl}/admin/profile

Welcome to the #play14 community!
          `.trim(),
        })

        strapi.log.info(`[PlayerClaim] Sent approval email to ${claim.user.email} for claim ${result.documentId}`)
      } catch (error) {
        strapi.log.error(`[PlayerClaim] Failed to send approval email: ${error}`)
      }
    } else if (newStatus === "rejected") {
      // Send rejection email to user
      try {
        await strapi.plugin("email").service("email").send({
          to: claim.user.email,
          subject: `[#play14] Player Claim Update`,
          html: `
            <h2>Player Claim Update</h2>
            <p>Unfortunately, your claim to the player profile "<strong>${claim.player.name}</strong>" could not be approved.</p>

            ${result.adminNotes ? `
            <h3>Reason:</h3>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${result.adminNotes}</p>
            ` : ""}

            <p>If you believe this is an error, please contact us or try claiming a different profile.</p>

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
Player Claim Update

Unfortunately, your claim to the player profile "${claim.player.name}" could not be approved.

${result.adminNotes ? `Reason: ${result.adminNotes}` : ""}

If you believe this is an error, please contact us at ${frontendUrl}/contact or try claiming a different profile.
          `.trim(),
        })

        strapi.log.info(`[PlayerClaim] Sent rejection email to ${claim.user.email} for claim ${result.documentId}`)
      } catch (error) {
        strapi.log.error(`[PlayerClaim] Failed to send rejection email: ${error}`)
      }
    }
  },
}
