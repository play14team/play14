"use server"

import { getAuthCookie } from "@/libs/auth"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

export interface SocialNetworkInput {
  id?: string
  type: string
  url: string
}

export interface PlayerUpdateData {
  name: string
  position: "Player" | "Host" | "Mentor" | "Founder"
  company?: string
  tagline?: string
  bio?: string
  website?: string
  socialNetworks?: SocialNetworkInput[]
}

export interface UpdateResult {
  success: boolean
  error?: string
}

/**
 * Update the current user's player profile via Strapi REST API
 * Uses the custom /players/me endpoint that validates ownership
 */
export async function updatePlayerProfile(
  _documentId: string,
  data: PlayerUpdateData
): Promise<UpdateResult> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Format social networks for Strapi component
    const socialNetworks = data.socialNetworks?.map((sn) => ({
      ...(sn.id ? { id: sn.id } : {}),
      type: sn.type,
      url: sn.url,
    }))

    const requestBody = {
      data: {
        name: data.name,
        position: data.position,
        company: data.company || null,
        tagline: data.tagline || null,
        bio: data.bio || null,
        website: data.website || null,
        socialNetworks: socialNetworks || [],
      },
    }

    console.log("[PlayerProfile] Updating current user's player profile")
    console.log("[PlayerProfile] Request body:", JSON.stringify(requestBody, null, 2))

    // Use the custom /players/me endpoint that validates ownership
    const response = await fetch(`${STRAPI_URL}/api/players/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[PlayerProfile] Response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData?.error?.message ||
        `Failed to update profile (${response.status})`
      console.error("[PlayerProfile] Update failed:", errorMessage, errorData)
      return { success: false, error: errorMessage }
    }

    const responseData = await response.json().catch(() => ({}))
    console.log("[PlayerProfile] Update successful:", responseData?.data?.documentId)
    return { success: true }
  } catch (error) {
    console.error("[PlayerProfile] Update error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
