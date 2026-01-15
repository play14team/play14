"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

export interface SponsorListItem {
  documentId: string
  name: string
  url: string | null
  logo: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  } | null
  eventsCount: number
}

export interface SponsorsListResponse {
  data: SponsorListItem[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface SocialNetwork {
  id?: number
  url: string
  type: string
}

export interface SponsorForEdit {
  documentId: string
  name: string
  url: string | null
  logo: {
    id: number
    name?: string
    url: string
    formats?: {
      thumbnail?: { url: string; width: number; height: number }
      small?: { url: string; width: number; height: number }
      medium?: { url: string; width: number; height: number }
      large?: { url: string; width: number; height: number }
    }
  } | null
  socialNetworks: SocialNetwork[]
  eventsCount: number
  events: Array<{
    id: number
    name: string
    slug: string
  }>
}

const emptyResponse: SponsorsListResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
}

/**
 * Get list of sponsors with optional search
 */
export async function getSponsors(
  page = 1,
  pageSize = 25,
  search?: string
): Promise<SponsorsListResponse> {
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (search) {
    queryParams.search = search
  }

  const result = await strapiFetchWithQuery<SponsorsListResponse>(
    "/sponsors/admin",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error(`[Sponsors] Failed to fetch sponsors: ${result.status} - ${result.error}`)
    return emptyResponse
  }

  return result.data || emptyResponse
}

/**
 * Get a sponsor for editing
 */
export async function getSponsorForEdit(
  sponsorId: string
): Promise<SponsorForEdit | null> {
  const result = await strapiFetch<{ data: SponsorForEdit }>(
    "/sponsors/admin/:sponsorId",
    { sponsorId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data
}

export interface SponsorCreateData {
  name: string
  url?: string
  socialNetworks?: SocialNetwork[]
}

/**
 * Create a new sponsor
 */
export async function createSponsor(
  data: SponsorCreateData
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  const result = await strapiFetch<{ data: { documentId: string } }>(
    "/sponsors/admin",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create sponsor",
    }
  }

  return { success: true, documentId: result.data?.data.documentId }
}

export interface SponsorUpdateData {
  name?: string
  url?: string
  socialNetworks?: SocialNetwork[]
}

/**
 * Update a sponsor
 */
export async function updateSponsor(
  sponsorId: string,
  data: SponsorUpdateData
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/sponsors/admin/:sponsorId",
    { sponsorId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update sponsor",
    }
  }

  return { success: true }
}

/**
 * Delete a sponsor
 */
export async function deleteSponsor(
  sponsorId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/sponsors/admin/:sponsorId",
    { sponsorId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete sponsor",
    }
  }

  return { success: true }
}
