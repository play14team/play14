"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

export interface LinkedInPostPreview {
  text: string
  imageUrl?: string
  link?: string
  hashtags: string[]
  postType: string
}

export interface LinkedInPostHistoryItem {
  documentId: string
  postType: string
  content: string
  linkedInPostId?: string
  postStatus: string
  postedAt?: string
  errorMessage?: string
  playerName?: string
  createdAt: string
}

export async function previewLinkedInPost(
  slug: string,
  postType = "announcement"
): Promise<{ success: boolean; data?: LinkedInPostPreview; error?: string }> {
  const result = await strapiFetch<{ data: LinkedInPostPreview }>(
    "/admin/events/:slug/linkedin/preview",
    { slug },
    {
      method: "POST",
      body: { postType },
    }
  )

  // Also pass postType as query param
  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data?.data }
}

export async function postToLinkedIn(
  slug: string,
  postType = "manual",
  content?: string
): Promise<{
  success: boolean
  data?: { documentId: string; linkedInPostId: string; content: string }
  error?: string
}> {
  const result = await strapiFetch<{
    data: {
      success: boolean
      post: { documentId: string; linkedInPostId: string; content: string }
    }
  }>(
    "/admin/events/:slug/linkedin/post",
    { slug },
    {
      method: "POST",
      body: { postType, content },
    }
  )

  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data?.data.post }
}

export async function getLinkedInPostHistory(
  slug: string
): Promise<{ success: boolean; data?: LinkedInPostHistoryItem[]; error?: string }> {
  const result = await strapiFetch<{ data: LinkedInPostHistoryItem[] }>(
    "/admin/events/:slug/linkedin/history",
    { slug }
  )

  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data?.data ?? [] }
}

export async function regenerateLinkedInContent(
  slug: string,
  postType = "announcement"
): Promise<{ success: boolean; data?: LinkedInPostPreview; error?: string }> {
  const queryParams = new URLSearchParams({ postType })
  const result = await strapiFetchWithQuery<{ data: LinkedInPostPreview }>(
    "/admin/events/:slug/linkedin/regenerate",
    { slug },
    queryParams,
    { method: "POST" }
  )

  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data?.data }
}
