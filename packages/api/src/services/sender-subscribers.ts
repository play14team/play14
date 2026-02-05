/**
 * Sender.net Subscribers API service
 *
 * Handles subscriber management via the Sender.net Subscribers API.
 * Sender.net is the source of truth for newsletter subscribers.
 */

interface SenderSubscriberResponse {
  id?: number
  email?: string
  firstname?: string
  created_at?: string
}

interface SenderErrorResponse {
  message?: string
  errors?: Record<string, string[]>
}

/**
 * Add a subscriber to Sender.net for newsletter subscription
 *
 * @param email - Subscriber email address
 * @param firstName - Optional first name
 * @param source - Source indicator (defaults to "website")
 * @returns The created subscriber or error information
 */
export async function addSubscriberToGroup(
  email: string,
  firstName?: string,
  source: string = "website"
): Promise<{ success: boolean; data?: SenderSubscriberResponse; error?: string }> {
  const apiKey = process.env.SENDER_API_KEY
  const groupId = process.env.SENDER_GROUP_ID

  if (!apiKey) {
    strapi.log.error("[SenderSubscribers] SENDER_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  try {
    const body: Record<string, unknown> = {
      email,
      trigger_automation: false,
    }

    if (firstName) body.firstname = firstName
    if (groupId) body.groups = [groupId]

    const response = await fetch("https://api.sender.net/v2/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as SenderSubscriberResponse | SenderErrorResponse

    if (!response.ok) {
      const errorData = data as SenderErrorResponse
      const errorMessage = errorData.message || response.statusText

      strapi.log.warn(`[SenderSubscribers] Failed to add subscriber ${email}: ${errorMessage}`)

      // Handle duplicate subscriber (already exists) as success
      if (response.status === 409 || response.status === 422) {
        const errors = errorData.errors
        if (errors?.email?.some((e) => e.toLowerCase().includes("already"))) {
          return { success: true, data: { email } }
        }
      }

      return {
        success: false,
        error: errorMessage || "Failed to subscribe to newsletter",
      }
    }

    strapi.log.info(`[SenderSubscribers] Added subscriber ${email} (source: ${source})`)

    return { success: true, data: data as SenderSubscriberResponse }
  } catch (error) {
    strapi.log.error(
      `[SenderSubscribers] Error adding subscriber: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}
