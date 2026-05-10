"use server"

import { revalidatePath } from "next/cache"
import { strapiFetch, strapiFetchFormData, strapiFetchWithQuery } from "@/libs/strapi-client"
import type { GeoLocation } from "@/models/strapi"

/**
 * Revalidate all public pages that display player data
 */
function revalidatePlayerPages(slug?: string) {
  // Revalidate the specific player page if slug is provided
  if (slug) {
    revalidatePath(`/players/${slug}`)
  }

  // Revalidate player listing pages
  revalidatePath("/players")
}

export interface PlayerListItem {
  documentId: string
  name: string
  position: string
  company: string | null
  avatar: {
    url: string
  } | null
  inviteStatus: "pending" | "accepted" | null
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
  visible?: boolean
  location?: GeoLocation | string | null
  avatar: {
    url: string
  } | null
  socialNetworks: Array<{
    id: string
    socialNetworkType: string
    url: string
  }>
}

const emptyResponse: PlayersListResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 50, pageCount: 0, total: 0 } },
}

/**
 * Get list of players with optional letter filter, search query, or position filter
 */
export async function getPlayers(
  letter?: string,
  page = 1,
  pageSize = 50,
  search?: string,
  position?: string
): Promise<PlayersListResponse> {
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (letter) {
    queryParams.letter = letter
  }
  if (search) {
    queryParams.search = search
  }
  if (position) {
    queryParams.position = position
  }

  const result = await strapiFetchWithQuery<PlayersListResponse>(
    "/admin/players/list",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error(`[Players] Failed to fetch players: ${result.status} - ${result.error}`)
    return emptyResponse
  }

  return result.data || emptyResponse
}

/**
 * Get a player for editing
 */
export async function getPlayerForEdit(playerId: string): Promise<PlayerForEdit | null> {
  const result = await strapiFetch<{ data: PlayerForEdit }>(
    "/admin/players/:playerId/edit",
    { playerId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data
}

export interface PlayerUpdateData {
  name?: string
  company?: string | null
  tagline?: string | null
  bio?: string | null
  website?: string | null
  visible?: boolean
  location?: GeoLocation | null
  socialNetworks?: Array<{
    id?: string
    socialNetworkType: string
    url: string
  }>
}

/**
 * Update a player's profile
 */
export async function updatePlayer(
  playerId: string,
  data: PlayerUpdateData,
  slug?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/players/:playerId",
    { playerId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update player",
    }
  }

  // Revalidate public pages after successful update
  revalidatePlayerPages(slug)

  return { success: true }
}

/**
 * Update a player's position
 */
export async function updatePlayerPosition(
  playerId: string,
  position: string,
  slug?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/players/:playerId/position",
    { playerId },
    {
      method: "PUT",
      body: { data: { position } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update position",
    }
  }

  // Revalidate public pages after successful update
  revalidatePlayerPages(slug)

  return { success: true }
}

// ===========================================
// Player Settings (organizers only)
// ===========================================

export interface PlayerSettingsData {
  email: string
  username: string
  confirmed: boolean
  blocked: boolean
  provider: string
  defaultTshirtSize: string
  defaultFoodPreferences: string
}

interface PlayerSettingsResponse {
  data: {
    defaultTshirtSize?: string
    defaultFoodPreferences?: string
  }
  user: {
    email: string
    username: string
    confirmed: boolean
    blocked: boolean
    provider: string
  } | null
}

export async function getPlayerSettings(playerId: string): Promise<PlayerSettingsData | null> {
  const result = await strapiFetch<PlayerSettingsResponse>(
    "/admin/players/:playerId/settings",
    { playerId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null

  const { data: defaults, user } = result.data
  return {
    defaultTshirtSize: defaults?.defaultTshirtSize || "none",
    defaultFoodPreferences: defaults?.defaultFoodPreferences || "",
    email: user?.email || "",
    username: user?.username || "",
    confirmed: user?.confirmed ?? false,
    blocked: user?.blocked ?? false,
    provider: user?.provider || "",
  }
}

export async function updatePlayerSettings(
  playerId: string,
  data: { defaultTshirtSize: string; defaultFoodPreferences: string }
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/players/:playerId/settings",
    { playerId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return { success: false, error: result.error || "Failed to update settings" }
  }

  return { success: true }
}

export async function sendPlayerPasswordReset(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/players/:playerId/password-reset",
    { playerId },
    { method: "POST" }
  )

  if (!result.ok) {
    return { success: false, error: result.error || "Failed to send password reset" }
  }

  return { success: true }
}

/**
 * Set a player's avatar from the media library (organizers only)
 */
export async function setPlayerAvatarFromLibrary(
  playerId: string,
  fileId: number,
  slug?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/players/:playerId/avatar/library",
    { playerId },
    {
      method: "PUT",
      body: { data: { fileId } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to set avatar",
    }
  }

  // Revalidate public pages after successful update
  revalidatePlayerPages(slug)

  return { success: true }
}

/**
 * Remove a player's avatar (organizers only)
 */
export async function removePlayerAvatar(
  playerId: string,
  slug?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/players/:playerId/avatar",
    { playerId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to remove avatar",
    }
  }

  // Revalidate public pages after successful update
  revalidatePlayerPages(slug)

  return { success: true }
}

/**
 * Upload a player's avatar from disk (organizers only)
 */
export async function uploadPlayerAvatar(
  playerId: string,
  formData: FormData,
  slug?: string
): Promise<{ success: boolean; error?: string; avatarUrl?: string }> {
  const result = await strapiFetchFormData<{ data: { avatar?: { url: string } } }>(
    "/admin/players/:playerId/avatar/upload",
    { playerId },
    formData
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to upload avatar",
    }
  }

  // Revalidate public pages after successful update
  revalidatePlayerPages(slug)

  return {
    success: true,
    avatarUrl: result.data?.data?.avatar?.url,
  }
}
