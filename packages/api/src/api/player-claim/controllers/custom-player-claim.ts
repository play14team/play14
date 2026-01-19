/**
 * Custom controller for player claim management
 * Handles claim submission, approval, rejection, and user-player linking
 */

import type { Core } from "@strapi/strapi"
import { syncUserRoleWithPlayerPosition } from "../../../services/user-role-sync"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Check if the current user's name matches a player exactly
   * Used for auto-linking on first login
   */
  async checkMatch(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Check if user already has a player linked
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (userWithPlayer?.player) {
      strapi.log.info(
        `[PlayerClaim] checkMatch: User ${user.id} already linked to player ${userWithPlayer.player.id}`
      )
      return ctx.send({
        data: {
          hasExactMatch: false,
          alreadyLinked: true,
          player: null,
        },
      })
    }
    strapi.log.info(`[PlayerClaim] checkMatch: User ${user.id} has no linked player`)

    // Search for exact name match (case-insensitive)
    const userName = user.username || ""
    const players = await strapi.documents("api::player.player").findMany({
      filters: {
        $and: [
          { user: { $null: true } }, // Only players not already linked
        ],
      },
      populate: {
        avatar: {
          fields: ["name", "url", "width", "height"],
        },
      },
    })

    // Find exact match (case-insensitive)
    const exactMatch = players.find(
      (player) => player.name.toLowerCase() === userName.toLowerCase()
    )

    if (exactMatch) {
      return ctx.send({
        data: {
          hasExactMatch: true,
          alreadyLinked: false,
          player: {
            documentId: exactMatch.documentId,
            name: exactMatch.name,
            slug: exactMatch.slug,
            position: exactMatch.position,
            avatar: exactMatch.avatar,
          },
        },
      })
    }

    return ctx.send({
      data: {
        hasExactMatch: false,
        alreadyLinked: false,
        player: null,
      },
    })
  },

  /**
   * Get fuzzy search suggestions for player claiming
   * Uses the fuzzy-search plugin or falls back to basic search
   */
  async getSuggestions(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const query = ctx.query.query || user.username || ""

    if (!query || query.length < 2) {
      return ctx.send({
        data: {
          suggestions: [],
        },
      })
    }

    // Get all unlinked players and do fuzzy matching
    const players = await strapi.documents("api::player.player").findMany({
      filters: {
        user: { $null: true }, // Only players not already linked
      },
      populate: {
        avatar: {
          fields: ["name", "url", "width", "height"],
        },
      },
    })

    // Simple fuzzy match: check if query words appear in player name
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    const matches = players
      .map((player) => {
        const nameLower = player.name.toLowerCase()
        let score = 0

        // Exact match gets highest score
        if (nameLower === queryLower) {
          score = 1000
        } else if (nameLower.includes(queryLower)) {
          // Name contains query as substring
          score = 500
        } else {
          // Check how many words match
          for (const word of queryWords) {
            if (word.length >= 2 && nameLower.includes(word)) {
              score += 100
            }
          }
        }

        // Check company too
        if (player.company) {
          const companyLower = player.company.toLowerCase()
          if (companyLower.includes(queryLower)) {
            score += 50
          }
        }

        return { player, score }
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limit to 10 suggestions

    return ctx.send({
      data: {
        suggestions: matches.map((match) => ({
          documentId: match.player.documentId,
          name: match.player.name,
          slug: match.player.slug,
          position: match.player.position,
          company: match.player.company,
          avatar: match.player.avatar,
          score: match.score,
        })),
      },
    })
  },

  /**
   * Get the current user's pending claims
   */
  async findMyClaims(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const claims = await strapi.documents("api::player-claim.player-claim").findMany({
      filters: {
        user: { id: user.id },
      },
      populate: {
        player: {
          fields: ["documentId", "name", "slug", "position"],
          populate: {
            avatar: {
              fields: ["name", "url", "width", "height"],
            },
          },
        },
      },
      sort: { createdAt: "desc" },
    })

    return ctx.send({
      data: claims,
    })
  },

  /**
   * Submit a claim request for a player profile
   */
  async submitClaim(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    const { playerId, reason } = ctx.request.body?.data || {}

    if (!playerId) {
      return ctx.badRequest("Player ID is required")
    }

    if (!reason || reason.length < 20) {
      return ctx.badRequest("Please provide a reason with at least 20 characters")
    }

    // Check if user already has a player linked
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (userWithPlayer?.player) {
      return ctx.badRequest("You already have a player profile linked")
    }

    // Check if player exists and is not already linked
    const player = await strapi.documents("api::player.player").findOne({
      documentId: playerId,
      populate: {
        user: true,
      },
    })

    if (!player) {
      return ctx.notFound("Player not found")
    }

    if (player.user) {
      return ctx.badRequest("This player is already linked to another user")
    }

    // Check for existing pending claim for this player by this user
    const existingClaim = await strapi.documents("api::player-claim.player-claim").findMany({
      filters: {
        user: { id: user.id },
        player: { documentId: playerId },
        claimStatus: "pending",
      },
    })

    if (existingClaim.length > 0) {
      return ctx.badRequest("You already have a pending claim for this player")
    }

    // Create the claim
    const claim = await strapi.documents("api::player-claim.player-claim").create({
      data: {
        claimStatus: "pending",
        user: user.id,
        player: player.id,
        reason,
      },
      populate: {
        player: {
          fields: ["documentId", "name", "slug", "position"],
        },
      },
    })

    strapi.log.info(
      `[PlayerClaim] User ${user.id} (${user.email}) submitted claim for player ${playerId}`
    )

    return ctx.send({
      data: claim,
    })
  },

  /**
   * Cancel the user's own pending claim
   */
  async cancelClaim(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Find the claim
    const claim = await strapi.documents("api::player-claim.player-claim").findOne({
      documentId: id,
      populate: {
        user: true,
      },
    })

    if (!claim) {
      return ctx.notFound("Claim not found")
    }

    // Check ownership
    if (claim.user?.id !== user.id) {
      return ctx.forbidden("You can only cancel your own claims")
    }

    // Check status
    if (claim.claimStatus !== "pending") {
      return ctx.badRequest("Only pending claims can be cancelled")
    }

    // Delete the claim
    await strapi.documents("api::player-claim.player-claim").delete({
      documentId: id,
    })

    strapi.log.info(`[PlayerClaim] User ${user.id} cancelled claim ${id}`)

    return ctx.send({
      data: { success: true },
    })
  },

  /**
   * List all pending claims (admin only)
   */
  async getPendingClaims(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Check if user is a founder (admin)
    const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (userWithPlayer?.player?.position !== "Founder") {
      return ctx.forbidden("Only founders can view pending claims")
    }

    const claims = await strapi.documents("api::player-claim.player-claim").findMany({
      filters: {
        claimStatus: "pending",
      },
      populate: {
        user: {
          fields: ["id", "username", "email", "provider"],
        },
        player: {
          fields: ["documentId", "name", "slug", "position"],
          populate: {
            avatar: {
              fields: ["name", "url", "width", "height"],
            },
          },
        },
      },
      sort: { createdAt: "asc" },
    })

    return ctx.send({
      data: claims,
    })
  },

  /**
   * Approve a claim request (admin only)
   * This links the user to the player
   */
  async approveClaim(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const { adminNotes } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Check if user is a founder (admin)
    const adminWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (adminWithPlayer?.player?.position !== "Founder") {
      return ctx.forbidden("Only founders can approve claims")
    }

    // Find the claim
    const claim = await strapi.documents("api::player-claim.player-claim").findOne({
      documentId: id,
      populate: {
        user: true,
        player: true,
      },
    })

    if (!claim) {
      return ctx.notFound("Claim not found")
    }

    if (claim.claimStatus !== "pending") {
      return ctx.badRequest("Only pending claims can be approved")
    }

    // Double-check player is not already linked
    const player = await strapi.documents("api::player.player").findOne({
      documentId: claim.player.documentId,
      populate: { user: true },
    })

    if (player?.user) {
      return ctx.badRequest("This player is already linked to another user")
    }

    // Link the user to the player (User owns the relation via 'player' field)
    strapi.log.info(
      `[PlayerClaim] Linking user ${claim.user.id} to player id=${player.id}, documentId=${player.documentId}`
    )
    const claimUser = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: claim.user.id },
    })
    if (!claimUser) {
      return ctx.badRequest("Claim user not found")
    }
    const updateResult = await strapi.documents("plugin::users-permissions.user").update({
      documentId: claimUser.documentId,
      data: { player: player.id } as any,
    })
    strapi.log.info(`[PlayerClaim] User update result: player=${updateResult?.player}`)

    // Verify the link was created
    const verifyUser = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: claim.user.id },
      populate: { player: true },
    })
    strapi.log.info(
      `[PlayerClaim] Verification - User ${claim.user.id} now has player: ${verifyUser?.player?.id || "NONE"}`
    )

    // Sync user role based on the linked player's position
    try {
      await syncUserRoleWithPlayerPosition(strapi, claim.user.id)
      strapi.log.info(
        `[PlayerClaim] User role synced with player position for user ${claim.user.id}`
      )
    } catch (syncError) {
      strapi.log.error(`[PlayerClaim] Failed to sync user role: ${syncError}`)
      // Don't fail claim approval if role sync fails
    }

    // Update the claim status
    // Note: Type cast needed until types are regenerated after schema creation
    const now = new Date().toISOString()
    strapi.log.info(
      `[PlayerClaim] Updating claim ${id} with claimStatus=approved, processedAt=${now}`
    )
    const updatedClaim = await strapi.documents("api::player-claim.player-claim").update({
      documentId: id,
      data: {
        claimStatus: "approved",
        adminNotes: adminNotes || null,
        processedAt: now,
      } as any,
    })
    strapi.log.info(
      `[PlayerClaim] Update result: claimStatus=${updatedClaim.claimStatus}, processedAt=${updatedClaim.processedAt}`
    )

    // Verify the claim was updated correctly
    const verifyClaim = await strapi.documents("api::player-claim.player-claim").findOne({
      documentId: id,
    })
    strapi.log.info(
      `[PlayerClaim] Verification - Claim ${id}: claimStatus=${verifyClaim?.claimStatus}, processedAt=${verifyClaim?.processedAt}`
    )

    strapi.log.info(
      `[PlayerClaim] Claim ${id} approved by founder ${user.id}. User ${claim.user.id} linked to player ${claim.player.documentId}`
    )

    return ctx.send({
      data: updatedClaim,
    })
  },

  /**
   * Reject a claim request (admin only)
   */
  async rejectClaim(ctx) {
    const user = ctx.state.user
    const { id } = ctx.params
    const { adminNotes } = ctx.request.body?.data || {}

    if (!user) {
      return ctx.unauthorized("You must be logged in")
    }

    // Check if user is a founder (admin)
    const adminWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
      filters: { id: user.id },
      populate: { player: true },
    })

    if (adminWithPlayer?.player?.position !== "Founder") {
      return ctx.forbidden("Only founders can reject claims")
    }

    // Find the claim
    const claim = await strapi.documents("api::player-claim.player-claim").findOne({
      documentId: id,
    })

    if (!claim) {
      return ctx.notFound("Claim not found")
    }

    if (claim.claimStatus !== "pending") {
      return ctx.badRequest("Only pending claims can be rejected")
    }

    // Update the claim status
    // Note: Type cast needed until types are regenerated after schema creation
    const now = new Date().toISOString()
    strapi.log.info(`[PlayerClaim] Setting processedAt to: ${now}`)
    const updatedClaim = await strapi.documents("api::player-claim.player-claim").update({
      documentId: id,
      data: {
        claimStatus: "rejected",
        adminNotes: adminNotes || null,
        processedAt: now,
      } as any,
    })

    strapi.log.info(
      `[PlayerClaim] Claim ${id} rejected by founder ${user.id}. ProcessedAt: ${updatedClaim.processedAt}`
    )

    return ctx.send({
      data: updatedClaim,
    })
  },
})
