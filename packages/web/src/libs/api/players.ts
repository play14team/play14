"use server"

import { restQuery, strapiFetch, strapiFetchFormData } from "@/libs/strapi-client"
import type { GeoLocation, Player, SocialNetwork, UploadFile } from "@/models/strapi"

/**
 * Player edit populate configuration
 * Includes all fields needed for the profile edit form
 */
const playerEditPopulate = {
  avatar: {
    fields: ["name", "url", "width", "height"],
  },
  socialNetworks: {
    fields: ["id", "url", "type"],
  },
}

/**
 * Full player type with all editable fields
 */
export interface PlayerProfile {
  documentId: string
  name: string
  slug: string
  position: "Player" | "Host" | "Mentor" | "Founder"
  company?: string
  tagline?: string
  bio?: string
  website?: string
  location?: GeoLocation | string
  avatar?: UploadFile
  socialNetworks?: SocialNetwork[]
}

/**
 * Get a player by documentId with all editable fields
 * Used for the player profile edit form
 */
export async function getPlayerByDocumentId(documentId: string): Promise<PlayerProfile | null> {
  const response = await restQuery<Player[]>("players", {
    filters: {
      documentId: { $eq: documentId },
    },
    populate: playerEditPopulate,
  })

  const player = response.data?.[0]
  if (!player || !player.documentId) {
    return null
  }

  return player as PlayerProfile
}

/**
 * Upload a picture for the current user's player profile
 */
export async function uploadPlayerPicture(
  file: File
): Promise<{ success: boolean; error?: string; player?: PlayerProfile }> {
  const formData = new FormData()
  formData.append("files", file)

  const result = await strapiFetchFormData<{ data: PlayerProfile }>(
    "/admin/players/me/picture",
    {},
    formData
  )

  if (!result.ok) {
    console.error("[PlayerPicture] Upload failed:", result.error)
    return { success: false, error: result.error || "Failed to upload picture" }
  }

  return { success: true, player: result.data?.data }
}

/**
 * Delete the picture for the current user's player profile
 */
export async function deletePlayerPicture(): Promise<{
  success: boolean
  error?: string
  player?: PlayerProfile
}> {
  const result = await strapiFetch<{ data: PlayerProfile }>(
    "/admin/players/me/picture",
    {},
    { method: "DELETE" }
  )

  if (!result.ok) {
    console.error("[PlayerPicture] Delete failed:", result.error)
    return { success: false, error: result.error || "Failed to delete picture" }
  }

  return { success: true, player: result.data?.data }
}
