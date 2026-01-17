"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

export interface PlayerForInvite {
  documentId: string
  name: string
  position: string
  company: string | null
  avatar: {
    url: string
  } | null
  user: {
    documentId: string
    email: string
    invitationStatus: string | null
    invitationSentAt: string | null
    blocked: boolean
  } | null
}

export interface PlayersForInviteResponse {
  data: PlayerForInvite[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface SendInviteResult {
  success: boolean
  error?: string
  message?: string
  userStatus?: "new" | "invited" | "accepted"
}

const emptyResponse: PlayersForInviteResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 20, pageCount: 0, total: 0 } },
}

/**
 * Search players for invite form
 * Uses the existing /players/list endpoint with search query
 */
export async function searchPlayersForInvite(
  query: string
): Promise<PlayerForInvite[]> {
  if (!query || query.length < 2) {
    return []
  }

  const queryParams: Record<string, string> = {
    search: query,
    page: "1",
    pageSize: "10",
  }

  const result = await strapiFetchWithQuery<PlayersForInviteResponse>(
    "/players/list",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error(`[Invite] Failed to search players: ${result.status} - ${result.error}`)
    return []
  }

  // The /players/list endpoint returns basic player info
  // We need to map it to include user info (will be null since list doesn't include it)
  const players = result.data?.data || []
  return players.map((player) => ({
    ...player,
    user: null, // User info not returned from list endpoint
  }))
}

/**
 * Get a single player with user info for the invite form
 */
export async function getPlayerForInvite(
  playerId: string
): Promise<PlayerForInvite | null> {
  // Use the getPlayerForEdit endpoint but we only need basic info + user relation
  const result = await strapiFetch<{ data: PlayerForInvite }>(
    "/players/:playerId/edit",
    { playerId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) {
    console.error(`[Invite] Failed to get player: ${result.status} - ${result.error}`)
    return null
  }

  // The edit endpoint doesn't include user info either
  // We return what we have - user info will be returned from the send-invite endpoint
  return {
    ...result.data.data,
    user: null,
  }
}

/**
 * Send invitation to a player
 */
export async function sendSingleInvite(
  playerId: string,
  email: string,
  customMessage?: string
): Promise<SendInviteResult> {
  const result = await strapiFetch<{
    success: boolean
    message?: string
    userStatus?: "new" | "invited" | "accepted"
  }>(
    "/players/:playerId/send-invite",
    { playerId },
    {
      method: "POST",
      body: {
        data: {
          email,
          customMessage: customMessage || undefined,
        },
      },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to send invitation",
    }
  }

  return {
    success: true,
    message: result.data?.message,
    userStatus: result.data?.userStatus,
  }
}
