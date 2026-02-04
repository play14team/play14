"use server"

import { strapiFetch, strapiFetchWithQuery } from "@/libs/strapi-client"

// ==================== TYPES ====================

export interface NewsletterListItem {
  documentId: string
  subject: string
  sendStatus: "draft" | "sending" | "sent" | "failed"
  sentAt: string | null
  recipientCount: number | null
  createdAt: string
  updatedAt: string
}

export interface NewslettersListResponse {
  data: NewsletterListItem[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface NewsletterForEdit {
  documentId: string
  subject: string
  body: string
  sendStatus: "draft" | "sending" | "sent" | "failed"
  sentAt: string | null
  recipientCount: number | null
  resendBroadcastId: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

const emptyResponse: NewslettersListResponse = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
}

// ==================== CRUD ACTIONS ====================

/**
 * Get list of newsletters with pagination
 */
export async function getNewsletters(page = 1, pageSize = 25): Promise<NewslettersListResponse> {
  const queryParams: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }

  const result = await strapiFetchWithQuery<NewslettersListResponse>(
    "/admin/newsletters",
    {},
    queryParams,
    { cache: "no-store" }
  )

  if (!result.ok) {
    console.error(`[Newsletter] Failed to fetch newsletters: ${result.status} - ${result.error}`)
    return emptyResponse
  }

  return result.data || emptyResponse
}

/**
 * Get a newsletter for editing
 */
export async function getNewsletterForEdit(
  newsletterId: string
): Promise<NewsletterForEdit | null> {
  const result = await strapiFetch<{ data: NewsletterForEdit }>(
    "/admin/newsletters/:newsletterId",
    { newsletterId },
    { cache: "no-store" }
  )

  if (!result.ok || !result.data) return null
  return result.data.data
}

export interface NewsletterCreateData {
  subject: string
  body: string
}

/**
 * Create a new newsletter draft
 */
export async function createNewsletter(
  data: NewsletterCreateData
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  const result = await strapiFetch<{ data: { documentId: string } }>(
    "/admin/newsletters",
    {},
    {
      method: "POST",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to create newsletter",
    }
  }

  return { success: true, documentId: result.data?.data.documentId }
}

export interface NewsletterUpdateData {
  subject?: string
  body?: string
}

/**
 * Update a newsletter draft
 */
export async function updateNewsletter(
  newsletterId: string,
  data: NewsletterUpdateData
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/newsletters/:newsletterId",
    { newsletterId },
    {
      method: "PUT",
      body: { data },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update newsletter",
    }
  }

  return { success: true }
}

/**
 * Delete a newsletter draft
 */
export async function deleteNewsletter(
  newsletterId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/newsletters/:newsletterId",
    { newsletterId },
    { method: "DELETE" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to delete newsletter",
    }
  }

  return { success: true }
}

/**
 * Retry a failed newsletter (reset to draft)
 */
export async function retryNewsletter(
  newsletterId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await strapiFetch(
    "/admin/newsletters/:newsletterId/retry",
    { newsletterId },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to reset newsletter for retry",
    }
  }

  return { success: true }
}

// ==================== SEND ACTIONS ====================

/**
 * Get audience count
 */
export async function getAudienceCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  const result = await strapiFetch<{ data: { count: number } }>(
    "/admin/newsletters/audience-count",
    {},
    { cache: "no-store" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to get audience count",
    }
  }

  return { success: true, count: result.data?.data.count }
}

/**
 * Send test email to the current user
 */
export async function sendTestNewsletter(
  newsletterId: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  const result = await strapiFetch<{ data: { success: boolean; email: string } }>(
    "/admin/newsletters/:newsletterId/send-test",
    { newsletterId },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to send test email",
    }
  }

  return { success: true, email: result.data?.data.email }
}

/**
 * Send newsletter to all subscribers
 */
export async function sendNewsletter(
  newsletterId: string
): Promise<{ success: boolean; recipientCount?: number; error?: string }> {
  const result = await strapiFetch<{ data: { success: boolean; recipientCount: number } }>(
    "/admin/newsletters/:newsletterId/send",
    { newsletterId },
    { method: "POST" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to send newsletter",
    }
  }

  return { success: true, recipientCount: result.data?.data.recipientCount }
}

/**
 * Get newsletter preview HTML
 */
export async function getNewsletterPreview(
  newsletterId: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  const result = await strapiFetch<{ data: { html: string } }>(
    "/admin/newsletters/:newsletterId/preview",
    { newsletterId },
    { cache: "no-store" }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to generate preview",
    }
  }

  return { success: true, html: result.data?.data.html }
}

// ==================== AI ACTIONS ====================

/**
 * Generate newsletter content using AI
 */
export async function aiGenerateContent(
  prompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const result = await strapiFetch<{ data: { content: string } }>(
    "/admin/newsletters/ai/generate",
    {},
    {
      method: "POST",
      body: { data: { prompt } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to generate content",
    }
  }

  return { success: true, content: result.data?.data.content }
}

/**
 * Improve newsletter content using AI
 */
export async function aiImproveContent(
  content: string,
  instructions: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const result = await strapiFetch<{ data: { content: string } }>(
    "/admin/newsletters/ai/improve",
    {},
    {
      method: "POST",
      body: { data: { content, instructions } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to improve content",
    }
  }

  return { success: true, content: result.data?.data.content }
}

/**
 * Generate subject line suggestions using AI
 */
export async function aiSuggestSubjects(
  content: string
): Promise<{ success: boolean; subjects?: string[]; error?: string }> {
  const result = await strapiFetch<{ data: { subjects: string[] } }>(
    "/admin/newsletters/ai/subjects",
    {},
    {
      method: "POST",
      body: { data: { content } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to generate subject suggestions",
    }
  }

  return { success: true, subjects: result.data?.data.subjects }
}
