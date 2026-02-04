/**
 * Resend Broadcast API service
 *
 * Handles newsletter broadcasting via Resend's Broadcast API.
 * Uses the configured segment to send newsletters to all subscribers.
 */

interface ResendBroadcastResponse {
  id: string
}

interface ResendSegmentContactsResponse {
  object: string
  data: ResendContact[]
}

interface ResendContact {
  id: string
  email: string
  first_name?: string
  last_name?: string
  created_at: string
  unsubscribed: boolean
}

interface ResendErrorResponse {
  statusCode: number
  message: string
  name: string
}

/**
 * Get the count of active (non-unsubscribed) contacts in the newsletter segment
 */
export async function getSegmentCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID

  if (!apiKey) {
    strapi.log.error("[ResendBroadcast] RESEND_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  if (!segmentId) {
    strapi.log.error("[ResendBroadcast] RESEND_NEWSLETTER_SEGMENT_ID is not configured")
    return { success: false, error: "Newsletter segment is not configured" }
  }

  try {
    const response = await fetch(`https://api.resend.com/segments/${segmentId}/contacts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ResendErrorResponse
      strapi.log.error(`[ResendBroadcast] Failed to get segment contacts: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to get segment count" }
    }

    const data = (await response.json()) as ResendSegmentContactsResponse
    const activeContacts = data.data.filter((contact) => !contact.unsubscribed)

    return { success: true, count: activeContacts.length }
  } catch (error) {
    strapi.log.error(
      `[ResendBroadcast] Error getting segment count: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}

/**
 * Send a newsletter broadcast to all subscribers in the segment
 */
export async function sendBroadcast(
  subject: string,
  htmlContent: string
): Promise<{
  success: boolean
  broadcastId?: string
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID
  const fromEmail = process.env.RESEND_DEFAULT_FROM || "noreply@play14.org"
  const replyTo = process.env.RESEND_REPLY_TO || "community@play14.org"

  if (!apiKey) {
    strapi.log.error("[ResendBroadcast] RESEND_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  if (!segmentId) {
    strapi.log.error("[ResendBroadcast] RESEND_NEWSLETTER_SEGMENT_ID is not configured")
    return { success: false, error: "Newsletter segment is not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        segment_id: segmentId,
        from: fromEmail,
        reply_to: replyTo,
        subject,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ResendErrorResponse
      strapi.log.error(`[ResendBroadcast] Failed to send broadcast: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to send newsletter" }
    }

    const data = (await response.json()) as ResendBroadcastResponse
    strapi.log.info(`[ResendBroadcast] Broadcast sent successfully: ${data.id}`)

    return { success: true, broadcastId: data.id }
  } catch (error) {
    strapi.log.error(
      `[ResendBroadcast] Error sending broadcast: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}

/**
 * Send a test email to a single recipient
 */
export async function sendTestEmail(
  email: string,
  subject: string,
  htmlContent: string
): Promise<{
  success: boolean
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_DEFAULT_FROM || "noreply@play14.org"
  const replyTo = process.env.RESEND_REPLY_TO || "community@play14.org"

  if (!apiKey) {
    strapi.log.error("[ResendBroadcast] RESEND_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        reply_to: replyTo,
        subject: `[TEST] ${subject}`,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ResendErrorResponse
      strapi.log.error(`[ResendBroadcast] Failed to send test email: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to send test email" }
    }

    strapi.log.info(`[ResendBroadcast] Test email sent to ${email}`)
    return { success: true }
  } catch (error) {
    strapi.log.error(
      `[ResendBroadcast] Error sending test email: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}
