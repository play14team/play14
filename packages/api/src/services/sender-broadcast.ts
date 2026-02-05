/**
 * Sender.net Broadcast API service
 *
 * Handles newsletter broadcasting via Sender.net's Campaigns API.
 * Uses the configured group to send newsletters to all subscribers.
 */

interface SenderGroupResponse {
  data?: {
    id: string
    title: string
    active_subscribers_count?: number
    subscribers_count?: number
  }
}

interface SenderCampaignResponse {
  data?: {
    id: string
  }
}

interface SenderErrorResponse {
  message?: string
  errors?: Record<string, string[]>
}

/**
 * Get the count of active subscribers in the newsletter group
 */
export async function getGroupSubscriberCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  const apiKey = process.env.SENDER_API_KEY
  const groupId = process.env.SENDER_GROUP_ID

  if (!apiKey) {
    strapi.log.error("[SenderBroadcast] SENDER_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  if (!groupId) {
    strapi.log.error("[SenderBroadcast] SENDER_GROUP_ID is not configured")
    return { success: false, error: "Newsletter group is not configured" }
  }

  try {
    const response = await fetch(`https://api.sender.net/v2/groups/${groupId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorData = (await response.json()) as SenderErrorResponse
      strapi.log.error(`[SenderBroadcast] Failed to get group info: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to get subscriber count" }
    }

    const data = (await response.json()) as SenderGroupResponse
    const count = data.data?.active_subscribers_count ?? data.data?.subscribers_count ?? 0

    return { success: true, count }
  } catch (error) {
    strapi.log.error(
      `[SenderBroadcast] Error getting subscriber count: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}

/**
 * Send a newsletter broadcast to all subscribers in the group
 */
export async function sendBroadcast(
  subject: string,
  htmlContent: string
): Promise<{
  success: boolean
  broadcastId?: string
  error?: string
}> {
  const apiKey = process.env.SENDER_API_KEY
  const groupId = process.env.SENDER_GROUP_ID
  const fromEmail = process.env.EMAIL_DEFAULT_FROM || "noreply@play14.org"
  const replyTo = process.env.EMAIL_REPLY_TO || "community@play14.org"

  if (!apiKey) {
    strapi.log.error("[SenderBroadcast] SENDER_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  if (!groupId) {
    strapi.log.error("[SenderBroadcast] SENDER_GROUP_ID is not configured")
    return { success: false, error: "Newsletter group is not configured" }
  }

  try {
    // Step 1: Create the campaign
    const createResponse = await fetch("https://api.sender.net/v2/campaigns", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: subject,
        subject,
        from: fromEmail,
        reply_to: replyTo,
        html_content: htmlContent,
        groups: [groupId],
      }),
    })

    if (!createResponse.ok) {
      const errorData = (await createResponse.json()) as SenderErrorResponse
      strapi.log.error(`[SenderBroadcast] Failed to create campaign: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to create newsletter campaign" }
    }

    const campaignData = (await createResponse.json()) as SenderCampaignResponse
    const campaignId = campaignData.data?.id

    if (!campaignId) {
      strapi.log.error("[SenderBroadcast] Campaign created but no ID returned")
      return { success: false, error: "Failed to create newsletter campaign" }
    }

    // Step 2: Send the campaign
    const sendResponse = await fetch(`https://api.sender.net/v2/campaigns/${campaignId}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!sendResponse.ok) {
      const errorData = (await sendResponse.json()) as SenderErrorResponse
      strapi.log.error(`[SenderBroadcast] Failed to send campaign: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to send newsletter" }
    }

    strapi.log.info(`[SenderBroadcast] Campaign sent successfully: ${campaignId}`)

    return { success: true, broadcastId: campaignId }
  } catch (error) {
    strapi.log.error(
      `[SenderBroadcast] Error sending broadcast: ${error instanceof Error ? error.message : String(error)}`
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
  const apiKey = process.env.SENDER_API_KEY
  const fromEmail = process.env.EMAIL_DEFAULT_FROM || "noreply@play14.org"
  const replyTo = process.env.EMAIL_REPLY_TO || "community@play14.org"

  if (!apiKey) {
    strapi.log.error("[SenderBroadcast] SENDER_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  try {
    // Parse from address for Sender.net's { email, name } format
    // Sender.net requires from.name to always be present
    const fromMatch = fromEmail.match(/^(.+?)\s*<([^>]+)>$/)
    const fromObj = fromMatch
      ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() }
      : { email: fromEmail, name: "#play14 community" }

    const response = await fetch("https://api.sender.net/v2/message/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from: fromObj,
        to: { email },
        reply_to: { email: replyTo },
        subject: `[TEST] ${subject}`,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as SenderErrorResponse
      strapi.log.error(`[SenderBroadcast] Failed to send test email: ${errorData.message}`)
      return { success: false, error: errorData.message || "Failed to send test email" }
    }

    strapi.log.info(`[SenderBroadcast] Test email sent to ${email}`)
    return { success: true }
  } catch (error) {
    strapi.log.error(
      `[SenderBroadcast] Error sending test email: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}
