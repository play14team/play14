/**
 * Authentication helpers for integration tests
 *
 * Provides utilities for generating JWT tokens and creating
 * authenticated test users with proper role assignments.
 */

import type { Core } from "@strapi/strapi"
import { seedTestUser, seedTestPlayer, linkUserToPlayer } from "../../test-utils/seed-database"

/**
 * Generate a JWT token for a user
 */
export async function generateAuthToken(strapi: Core.Strapi, userId: number): Promise<string> {
  const jwtService = strapi.plugin("users-permissions").service("jwt")
  return jwtService.issue({ id: userId })
}

/**
 * Create an authenticated user with player profile
 *
 * Returns user, player, and JWT token ready for API requests
 */
export async function createAuthenticatedUser(
  strapi: Core.Strapi,
  options: {
    email?: string
    username?: string
    playerName?: string
    role?: "authenticated" | "player" | "host" | "public"
  } = {}
): Promise<{
  user: { id: number; documentId: string; email: string; username: string }
  player: { id: number; documentId: string; name: string; slug: string }
  token: string
}> {
  // Use "player" role by default since we create a player profile
  // The player role has permissions for ticket ordering and profile management
  const roleType = options.role || "player"
  const role = await strapi.query("plugin::users-permissions.role").findOne({
    where: { type: roleType },
  })

  if (!role) {
    throw new Error(`Role '${roleType}' not found. Make sure the database is properly initialized.`)
  }

  // Create user with the specified role
  const email = options.email || `testuser_${Date.now()}@example.com`
  const user = await seedTestUser(strapi, {
    email,
    username: options.username || email.split("@")[0],
    role: roleType,
  })

  // Create player profile
  const player = await seedTestPlayer(strapi, {
    name: options.playerName || `Player ${user.id}`,
    email,
    user: user.id,
  })

  // Link user to player
  await linkUserToPlayer(strapi, user.id, player.id)

  // Generate token
  const token = await generateAuthToken(strapi, user.id)

  return { user, player, token }
}

/**
 * Create an event host with Stripe account capabilities
 *
 * Hosts have elevated permissions for event management and Stripe integration
 */
export async function createEventHost(
  strapi: Core.Strapi,
  options: {
    email?: string
    playerName?: string
  } = {}
): Promise<{
  user: { id: number; documentId: string; email: string; username: string }
  player: { id: number; documentId: string; name: string; slug: string }
  token: string
}> {
  return createAuthenticatedUser(strapi, {
    email: options.email || `host_${Date.now()}@example.com`,
    playerName: options.playerName || `Host ${Date.now()}`,
    role: "host",
  })
}

/**
 * Get authorization header for requests
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` }
}
