"use server"

import { getAuthCookie } from "@/libs/auth"
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

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

/**
 * Check if the current user's name matches a player exactly
 */
export async function checkExactMatch(): Promise<ExactMatchResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { hasExactMatch: false, alreadyLinked: false, player: null }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/player-claims/check-match`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[PlayerLinking] Check match failed:", response.status)
      return { hasExactMatch: false, alreadyLinked: false, player: null }
    }

    const result = await response.json()
    console.log("[PlayerLinking] Check match result:", JSON.stringify(result.data))
    return result.data as ExactMatchResult
  } catch (error) {
    console.error("[PlayerLinking] Check match error:", error)
    return { hasExactMatch: false, alreadyLinked: false, player: null }
  }
}

/**
 * Get fuzzy search suggestions for player claiming
 */
export async function getSuggestions(query?: string): Promise<PlayerSuggestion[]> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return []
  }

  try {
    const url = new URL(`${STRAPI_URL}/api/player-claims/suggestions`)
    if (query) {
      url.searchParams.set("query", query)
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[PlayerLinking] Get suggestions failed:", response.status)
      return []
    }

    const result = await response.json()
    return result.data?.suggestions || []
  } catch (error) {
    console.error("[PlayerLinking] Get suggestions error:", error)
    return []
  }
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
  const jwt = await getAuthCookie()

  if (!jwt) {
    return []
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/player-claims/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("[PlayerLinking] Get claims failed:", response.status)
      return []
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error("[PlayerLinking] Get claims error:", error)
    return []
  }
}

/**
 * Submit a claim request for a player profile
 */
export async function submitClaim(
  playerId: string,
  reason: string
): Promise<ClaimResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/player-claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          playerId,
          reason,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message || `Failed to submit claim (${response.status})`
      console.error("[PlayerLinking] Submit claim failed:", errorMessage)
      return { success: false, error: errorMessage }
    }

    const result = await response.json()
    return { success: true, claim: result.data }
  } catch (error) {
    console.error("[PlayerLinking] Submit claim error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Cancel a pending claim
 */
export async function cancelClaim(claimId: string): Promise<ActionResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/player-claims/${claimId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message || `Failed to cancel claim (${response.status})`
      console.error("[PlayerLinking] Cancel claim failed:", errorMessage)
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (error) {
    console.error("[PlayerLinking] Cancel claim error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Auto-link a player to the current user (for exact name matches)
 */
export async function autoLinkPlayer(playerId: string): Promise<AutoLinkResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/players/auto-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          playerId,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message || `Failed to link player (${response.status})`
      console.error("[PlayerLinking] Auto-link failed:", errorMessage)
      return { success: false, error: errorMessage }
    }

    const result = await response.json()
    return { success: true, player: result.data }
  } catch (error) {
    console.error("[PlayerLinking] Auto-link error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Create a new player profile and link to the current user
 */
export async function createPlayerForUser(
  data: CreatePlayerData
): Promise<CreatePlayerResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/players/create-for-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          name: data.name,
          company: data.company || null,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message || `Failed to create player (${response.status})`
      console.error("[PlayerLinking] Create player failed:", errorMessage)
      return { success: false, error: errorMessage }
    }

    const result = await response.json()
    return { success: true, player: result.data }
  } catch (error) {
    console.error("[PlayerLinking] Create player error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
