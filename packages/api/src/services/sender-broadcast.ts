/**
 * Sender.net Broadcast API service
 *
 * Handles newsletter broadcasting via Sender.net's Campaigns API.
 * Uses the configured group to send newsletters to all subscribers.
 */

import { fetchWithTimeout, parseFromAddress, SenderTimeoutError, safeJson } from "./sender-common"

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
  _raw?: string
}

/**
 * Best-effort extraction of a human-readable error message from a Sender.net
 * error response body. Falls back to a trimmed `_raw` snippet when the body
 * is HTML/non-JSON (common on 5xx / upstream proxy errors).
 */
function errorMessageFrom(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback
  const asError = body as SenderErrorResponse
  if (asError.message) return asError.message
  if (asError._raw) {
    const snippet = asError._raw.trim().slice(0, 200)
    return snippet ? `Sender.net error: ${snippet}` : fallback
  }
  return fallback
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
    const response = await fetchWithTimeout(`https://api.sender.net/v2/groups/${groupId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    // Parse body once via safeJson — previous implementation called
    // response.json() on both branches, which throws "body already consumed"
    // on the error path.
    const body = await safeJson(response)

    if (!response.ok) {
      const message = errorMessageFrom(body, "Failed to get subscriber count")
      strapi.log.error(`[SenderBroadcast] Failed to get group info: ${message}`)
      return { success: false, error: message }
    }

    const data = body as SenderGroupResponse
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
 * Send a newsletter broadcast to all subscribers in the group.
 *
 * The return value is structured so the reconciliation cron can persist the
 * Sender.net campaign id even when the second /send step fails: in that case
 * we return `{ success: false, broadcastId, error }` so the caller can later
 * retry or mark the broadcast as failed. Keep the explicit union type — the
 * inferred one hides the fact that `broadcastId` is present on the send-step
 * failure branch too.
 */
export type SendBroadcastResult =
  | { success: true; broadcastId: string; error?: undefined }
  | { success: false; broadcastId?: string; error: string }

export async function sendBroadcast(
  subject: string,
  htmlContent: string
): Promise<SendBroadcastResult> {
  const apiKey = process.env.SENDER_API_KEY
  const groupId = process.env.SENDER_GROUP_ID
  const replyTo = process.env.EMAIL_REPLY_TO || "community@play14.org"

  if (!apiKey) {
    strapi.log.error("[SenderBroadcast] SENDER_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  if (!groupId) {
    strapi.log.error("[SenderBroadcast] SENDER_GROUP_ID is not configured")
    return { success: false, error: "Newsletter group is not configured" }
  }

  // Sender.net campaign API quirk: on POST /v2/campaigns, the `from` field is
  // the display NAME only — NOT an email address. The sender address is set
  // per verified-domain in the Sender.net account and surfaced to recipients
  // via the `reply_to` field. Passing an email in `from` silently mis-renders
  // the From header. Do not "simplify" this by swapping fromName for an email.
  const { name: fromName } = parseFromAddress()

  try {
    // Step 1: Create the campaign
    const createResponse = await fetchWithTimeout("https://api.sender.net/v2/campaigns", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: subject,
        subject,
        from: fromName,
        reply_to: replyTo,
        html_content: htmlContent,
        groups: [groupId],
      }),
    })

    if (!createResponse.ok) {
      const errorData = await safeJson(createResponse)
      const message = errorMessageFrom(errorData, "Failed to create newsletter campaign")
      strapi.log.error(`[SenderBroadcast] Failed to create campaign: ${message}`)
      return { success: false, error: message }
    }

    const campaignData = (await safeJson(createResponse)) as SenderCampaignResponse
    const campaignId = campaignData.data?.id

    if (!campaignId) {
      strapi.log.error("[SenderBroadcast] Campaign created but no ID returned")
      return { success: false, error: "Failed to create newsletter campaign" }
    }

    // Step 2: Send the campaign — only reached when step 1 returned an id.
    const sendResponse = await fetchWithTimeout(
      `https://api.sender.net/v2/campaigns/${campaignId}/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    )

    if (!sendResponse.ok) {
      const errorData = await safeJson(sendResponse)
      const message = errorMessageFrom(errorData, "Failed to send newsletter")
      strapi.log.error(`[SenderBroadcast] Failed to send campaign: ${message}`)
      // Return the campaign id anyway so the caller can persist it and the
      // reconciliation cron can pick up / retry / mark as failed later.
      return { success: false, broadcastId: campaignId, error: message }
    }

    strapi.log.info(`[SenderBroadcast] Campaign sent successfully: ${campaignId}`)

    return { success: true, broadcastId: campaignId }
  } catch (error) {
    strapi.log.error(
      `[SenderBroadcast] Error sending broadcast: ${error instanceof Error ? error.message : String(error)}`
    )
    const message =
      error instanceof SenderTimeoutError
        ? error.message
        : "Failed to connect to newsletter service"
    return { success: false, error: message }
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
  const replyTo = process.env.EMAIL_REPLY_TO || "community@play14.org"

  if (!apiKey) {
    strapi.log.error("[SenderBroadcast] SENDER_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  // Transactional /v2/message/send takes `from: { email, name }` — both
  // required. parseFromAddress centralises the same logic the email provider
  // uses (packages/api/providers/strapi-provider-email-sender).
  const fromObj = parseFromAddress()

  try {
    const response = await fetchWithTimeout("https://api.sender.net/v2/message/send", {
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
      const errorData = await safeJson(response)
      const message = errorMessageFrom(errorData, "Failed to send test email")
      strapi.log.error(`[SenderBroadcast] Failed to send test email: ${message}`)
      return { success: false, error: message }
    }

    strapi.log.info(`[SenderBroadcast] Test email sent to ${email}`)
    return { success: true }
  } catch (error) {
    strapi.log.error(
      `[SenderBroadcast] Error sending test email: ${error instanceof Error ? error.message : String(error)}`
    )
    const message =
      error instanceof SenderTimeoutError
        ? error.message
        : "Failed to connect to newsletter service"
    return { success: false, error: message }
  }
}
