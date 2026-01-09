"use server"

import { strapiFetch } from "@/libs/strapi-client"

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

  const result = await strapiFetch(
    "/players/me",
    {},
    {
      method: "PUT",
      body: requestBody,
    }
  )

  if (!result.ok) {
    console.error("[PlayerProfile] Update failed:", result.error)
    return { success: false, error: result.error || "Failed to update profile" }
  }

  return { success: true }
}
