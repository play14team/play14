"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"
import type {
  ExactMatchResult,
  PlayerSuggestion,
  PendingClaim,
  ActionResult,
  AutoLinkResult,
  CreatePlayerResult,
  ClaimResult,
  CreatePlayerData,
} from "./types"

const defaultMatchResult: ExactMatchResult = {
  hasExactMatch: false,
  alreadyLinked: false,
  player: null,
}

/**
 * Check if the current user's name matches a player exactly
 */
export async function checkExactMatch(): Promise<ExactMatchResult> {
  const result = await strapiFetch<{ data: ExactMatchResult }>(
    "/player-claims/check-match",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Check match failed:", result.status)
    return defaultMatchResult
  }

  console.log("[PlayerLinking] Check match result:", JSON.stringify(result.data?.data))
  return result.data?.data || defaultMatchResult
}

/**
 * Get fuzzy search suggestions for player claiming
 */
export async function getSuggestions(query?: string): Promise<PlayerSuggestion[]> {
  const queryParams: Record<string, string> = {}
  if (query) {
    queryParams.query = query
  }

  const result = await strapiFetchWithQuery<{ data: { suggestions: PlayerSuggestion[] } }>(
    "/player-claims/suggestions",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Get suggestions failed:", result.status)
    return []
  }

  return result.data?.data?.suggestions || []
}

/**
 * Search for players by name
 */
export async function searchPlayers(query: string): Promise<PlayerSuggestion[]> {
  // Reuse the suggestions endpoint with a custom query
  return getSuggestions(query)
}

/**
 * Get the current user's pending claims
 */
export async function getMyClaims(): Promise<PendingClaim[]> {
  const result = await strapiFetch<{ data: PendingClaim[] }>(
    "/player-claims/me",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Get claims failed:", result.status)
    return []
  }

  return result.data?.data || []
}

/**
 * Submit a claim request for a player profile
 */
export async function submitClaim(
  playerId: string,
  reason: string
): Promise<ClaimResult> {
  const result = await strapiFetch<{ data: PendingClaim }>(
    "/player-claims",
    {},
    {
      method: "POST",
      body: {
        data: {
          playerId,
          reason,
        },
      },
    }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Submit claim failed:", result.error)
    return { success: false, error: result.error || "Failed to submit claim" }
  }

  return { success: true, claim: result.data?.data }
}

/**
 * Cancel a pending claim
 */
export async function cancelClaim(claimId: string): Promise<ActionResult> {
  const result = await strapiFetch(
    "/player-claims/:claimId",
    { claimId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Cancel claim failed:", result.error)
    return { success: false, error: result.error || "Failed to cancel claim" }
  }

  return { success: true }
}

/**
 * Auto-link a player to the current user (for exact name matches)
 */
export async function autoLinkPlayer(playerId: string): Promise<AutoLinkResult> {
  const result = await strapiFetch<{ data: AutoLinkResult["player"] }>(
    "/players/auto-link",
    {},
    {
      method: "POST",
      body: {
        data: {
          playerId,
        },
      },
    }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Auto-link failed:", result.error)
    return { success: false, error: result.error || "Failed to link player" }
  }

  return { success: true, player: result.data?.data }
}

/**
 * Create a new player profile and link to the current user
 */
export async function createPlayerForUser(
  data: CreatePlayerData
): Promise<CreatePlayerResult> {
  const result = await strapiFetch<{ data: CreatePlayerResult["player"] }>(
    "/players/create-for-user",
    {},
    {
      method: "POST",
      body: {
        data: {
          name: data.name,
          company: data.company || null,
        },
      },
    }
  )

  if (!result.ok) {
    console.error("[PlayerLinking] Create player failed:", result.error)
    return { success: false, error: result.error || "Failed to create player" }
  }

  return { success: true, player: result.data?.data }
}
