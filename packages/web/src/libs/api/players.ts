"use server"

import { getAuthCookie } from "@/libs/auth"
import { restQuery } from "@/libs/strapi-client"
import type { Player, SocialNetwork, UploadFile, GeoLocation } from "@/models/strapi"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

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
  location?: GeoLocation
  avatar?: UploadFile
  socialNetworks?: SocialNetwork[]
}

/**
 * Get a player by documentId with all editable fields
 * Used for the player profile edit form
 */
export async function getPlayerByDocumentId(
  documentId: string
): Promise<PlayerProfile | null> {
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
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const formData = new FormData()
    formData.append("files", file)

    const response = await fetch(`${STRAPI_URL}/api/players/me/picture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message ||
        `Failed to upload picture (${response.status})`
      console.error("[PlayerPicture] Upload failed:", errorMessage, errorData)
      return { success: false, error: errorMessage }
    }

    const responseData = await response.json()
    return { success: true, player: responseData.data as PlayerProfile }
  } catch (error) {
    console.error("[PlayerPicture] Upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Delete the picture for the current user's player profile
 */
export async function deletePlayerPicture(): Promise<{
  success: boolean
  error?: string
  player?: PlayerProfile
}> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/players/me/picture`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message ||
        `Failed to delete picture (${response.status})`
      console.error("[PlayerPicture] Delete failed:", errorMessage, errorData)
      return { success: false, error: errorMessage }
    }

    const responseData = await response.json()
    return { success: true, player: responseData.data as PlayerProfile }
  } catch (error) {
    console.error("[PlayerPicture] Delete error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
