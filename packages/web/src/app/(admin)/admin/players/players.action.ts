"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface PlayerListItem {
  documentId: string
  name: string
  position: string
  company: string | null
  avatar: {
    url: string
  } | null
}

export interface PlayersListResponse {
  data: PlayerListItem[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface PlayerForEdit {
  documentId: string
  slug: string
  name: string
  position: string
  company: string | null
  tagline: string | null
  bio: string | null
  website: string | null
  avatar: {
    url: string
  } | null
  socialNetworks: Array<{
    id: string
    type: string
    url: string
  }>
}

/**
 * Get list of players with optional letter filter or search query
 */
export async function getPlayers(
  letter?: string,
  page = 1,
  pageSize = 50,
  search?: string
): Promise<PlayersListResponse> {
  const jwt = await getAuthCookie()
  if (!jwt) {
    return {
      data: [],
      meta: { pagination: { page: 1, pageSize: 50, pageCount: 0, total: 0 } },
    }
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    if (letter) {
      params.append("letter", letter)
    }
    if (search) {
      params.append("search", search)
    }

    const response = await fetch(
      `${STRAPI_URL}/api/players/list?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Players] Failed to fetch players: ${response.status} - ${errorText}`)
      return {
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, pageCount: 0, total: 0 } },
      }
    }

    const data = await response.json()
    return data
  } catch {
    return {
      data: [],
      meta: { pagination: { page: 1, pageSize: 50, pageCount: 0, total: 0 } },
    }
  }
}

/**
 * Get a player for editing
 */
export async function getPlayerForEdit(
  playerId: string
): Promise<PlayerForEdit | null> {
  const jwt = await getAuthCookie()
  if (!jwt) return null

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/players/${playerId}/edit`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: "no-store",
      }
    )

    if (!response.ok) return null
    const data = await response.json()
    return data.data
  } catch {
    return null
  }
}

export interface PlayerUpdateData {
  name?: string
  company?: string | null
  tagline?: string | null
  bio?: string | null
  website?: string | null
  socialNetworks?: Array<{
    id?: string
    type: string
    url: string
  }>
}

/**
 * Update a player's profile
 */
export async function updatePlayer(
  playerId: string,
  data: PlayerUpdateData
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(`${STRAPI_URL}/api/players/${playerId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to update player",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to update player" }
  }
}

/**
 * Update a player's position
 */
export async function updatePlayerPosition(
  playerId: string,
  position: string
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/players/${playerId}/position`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { position } }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to update position",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to update position" }
  }
}

/**
 * Set a player's avatar from the media library (organizers only)
 */
export async function setPlayerAvatarFromLibrary(
  playerId: string,
  fileId: number
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/players/${playerId}/avatar/library`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { fileId } }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to set avatar",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to set avatar" }
  }
}

/**
 * Remove a player's avatar (organizers only)
 */
export async function removePlayerAvatar(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/players/${playerId}/avatar`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to remove avatar",
      }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to remove avatar" }
  }
}

/**
 * Upload a player's avatar from disk (organizers only)
 */
export async function uploadPlayerAvatar(
  playerId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; avatarUrl?: string }> {
  const jwt = await getAuthCookie()
  if (!jwt) return { success: false, error: "Not authenticated" }

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/players/${playerId}/avatar/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || "Failed to upload avatar",
      }
    }

    const result = await response.json()
    return {
      success: true,
      avatarUrl: result.data?.avatar?.url,
    }
  } catch {
    return { success: false, error: "Failed to upload avatar" }
  }
}
