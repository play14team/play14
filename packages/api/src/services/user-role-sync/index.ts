/**
 * User Role Sync Service
 *
 * Provides functions to synchronize a user's role based on their linked player's position.
 * Used by both OAuth login flow and position update controller.
 */

import type { Core } from "@strapi/strapi"

// Map player positions to role types
const POSITION_TO_ROLE: Record<string, string> = {
  Player: "player",
  Host: "host",
  Mentor: "mentor",
  Founder: "founder",
}

/**
 * Sync a user's role based on a player's position.
 * Call this after updating a player's position to ensure the linked user
 * gets the correct role for their new position.
 *
 * @param strapi - Strapi instance
 * @param playerDocumentId - The player's documentId
 * @returns true if role was updated, false otherwise
 */
export async function syncUserRoleFromPlayer(
  strapi: Core.Strapi,
  playerDocumentId: string
): Promise<boolean> {
  // Find the player with their linked user
  const player = await strapi.documents("api::player.player").findOne({
    documentId: playerDocumentId,
    populate: {
      user: {
        populate: {
          role: true,
        },
      },
    },
  })

  if (!player) {
    strapi.log.warn(`[RoleSync] Player not found: ${playerDocumentId}`)
    return false
  }

  const user = (player as any).user
  if (!user) {
    strapi.log.debug(`[RoleSync] Player ${player.name} has no linked user`)
    return false
  }

  const position = player.position as string
  const expectedRoleType = POSITION_TO_ROLE[position]

  if (!expectedRoleType) {
    strapi.log.warn(`[RoleSync] Unknown position "${position}" for player ${player.name}`)
    return false
  }

  // Check if user already has the correct role
  const currentRoleType = user.role?.type
  if (currentRoleType === expectedRoleType) {
    strapi.log.debug(`[RoleSync] User ${user.email} already has correct role "${currentRoleType}"`)
    return false
  }

  // Find the role matching the player's position
  const targetRole = await strapi.documents("plugin::users-permissions.role").findFirst({
    filters: { type: expectedRoleType },
  })

  if (!targetRole) {
    strapi.log.warn(
      `[RoleSync] Role type "${expectedRoleType}" not found for position "${position}"`
    )
    return false
  }

  // Update user's role
  await strapi.documents("plugin::users-permissions.user").update({
    documentId: user.documentId,
    data: { role: targetRole.id } as any,
  })

  strapi.log.info(
    `[RoleSync] Updated user ${user.email} role from "${currentRoleType}" to "${expectedRoleType}" based on position "${position}"`
  )

  return true
}

/**
 * Sync user role based on user ID (for OAuth flow).
 * Call this after a user logs in via OAuth to ensure their role
 * matches their linked player's position.
 *
 * @param strapi - Strapi instance
 * @param userId - The user's numeric ID
 */
export async function syncUserRoleWithPlayerPosition(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  // Get user with player relation
  const userWithPlayer = await strapi.documents("plugin::users-permissions.user").findFirst({
    filters: { id: userId },
    populate: { role: true, player: true },
  })

  if (!userWithPlayer?.player?.position) {
    return // No player linked or no position set
  }

  const position = userWithPlayer.player.position as string
  const expectedRoleType = POSITION_TO_ROLE[position]

  if (!expectedRoleType) {
    return // Unknown position
  }

  // Check if user already has the correct role
  const currentRoleType = userWithPlayer.role?.type
  if (currentRoleType === expectedRoleType) {
    return // Role already correct
  }

  // Find the role matching the player's position
  const targetRole = await strapi.documents("plugin::users-permissions.role").findFirst({
    filters: { type: expectedRoleType },
  })

  if (!targetRole) {
    strapi.log.warn(`[OAuth] Role type "${expectedRoleType}" not found for position "${position}"`)
    return
  }

  // Update user's role
  await strapi.documents("plugin::users-permissions.user").update({
    documentId: userWithPlayer.documentId,
    data: { role: targetRole.id } as any,
  })

  strapi.log.info(
    `[OAuth] Updated user ${userId} role from "${currentRoleType}" to "${expectedRoleType}" based on player position "${position}"`
  )
}
