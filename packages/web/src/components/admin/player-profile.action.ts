"use server"

import { strapiFetch } from "@/libs/strapi-client"
import type { GeoLocation } from "@/models/strapi"
import { revalidatePath } from "next/cache"

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
  location?: GeoLocation | null
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
  data: PlayerUpdateData,
  slug?: string
): Promise<UpdateResult> {
  // Format social networks for Strapi component
  const socialNetworks = data.socialNetworks?.map((sn) => ({
    ...(sn.id ? { id: sn.id } : {}),
    type: sn.type,
    url: sn.url,
  }))

  const requestData: Record<string, unknown> = {
    name: data.name,
    position: data.position,
    company: data.company || null,
    tagline: data.tagline || null,
    bio: data.bio || null,
    website: data.website || null,
    socialNetworks: socialNetworks || [],
  }

  if ("location" in data) {
    requestData.location = data.location ?? null
  }

  const requestBody = { data: requestData }

  const result = await strapiFetch(
    "/admin/players/me",
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

  // Revalidate public pages after successful update
  revalidatePlayerPages(slug)

  return { success: true }
}
