"use server"

import { strapiFetch } from "@/libs/strapi-client"

export interface LinkedInAccountStatus {
  documentId: string
  linkedinUserId: string
  accountStatus: "pending" | "active" | "expired" | "revoked"
  displayName?: string
  profileUrl?: string
  connectedAt?: string
  tokenExpiresAt?: string
}

export async function getLinkedInAccountStatus(): Promise<{
  success: boolean
  data: LinkedInAccountStatus | null
  error?: string
}> {
  const result = await strapiFetch<{ data: LinkedInAccountStatus | null }>(
    "/admin/linkedin/connect/status",
    {}
  )

  if (!result.ok) {
    return { success: false, data: null, error: result.error }
  }

  return { success: true, data: result.data?.data ?? null }
}

export async function getLinkedInAuthUrl(): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  const result = await strapiFetch<{ data: { url: string } }>(
    "/admin/linkedin/connect/authorize",
    {},
    { method: "POST" }
  )

  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true, url: result.data?.data.url }
}

export async function disconnectLinkedIn(): Promise<{
  success: boolean
  error?: string
}> {
  const result = await strapiFetch<{ data: { success: boolean } }>(
    "/admin/linkedin/connect/disconnect",
    {},
    { method: "POST" }
  )

  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true }
}
