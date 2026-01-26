/**
 * Resend Contacts API service
 *
 * Handles subscriber management via the Resend Contacts API.
 * Resend is the source of truth for newsletter subscribers.
 */

interface ResendContactResponse {
  id?: string
  object?: string
  email?: string
  first_name?: string
  last_name?: string
  created_at?: string
  unsubscribed?: boolean
}

interface ResendErrorResponse {
  statusCode: number
  message: string
  name: string
}

/**
 * Add a contact to Resend for newsletter subscription
 *
 * @param email - Subscriber email address
 * @param firstName - Optional first name
 * @param source - Optional source indicator (e.g., "footer", "profile")
 * @returns The created contact or error information
 */
export async function addContactToAudience(
  email: string,
  firstName?: string,
  source?: string
): Promise<{ success: boolean; data?: ResendContactResponse; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    strapi.log.error("[ResendContacts] RESEND_API_KEY is not configured")
    return { success: false, error: "Newsletter service is not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        unsubscribed: false,
        properties: source ? { source } : undefined,
      }),
    })

    const data = (await response.json()) as ResendContactResponse | ResendErrorResponse

    if (!response.ok) {
      const errorData = data as ResendErrorResponse
      strapi.log.warn(
        `[ResendContacts] Failed to add contact ${email}: ${errorData.message || response.statusText}`
      )

      // Handle specific error cases
      if (response.status === 409 || errorData.message?.includes("already exists")) {
        // Contact already exists - this is not an error for the user
        return { success: true, data: { email } }
      }

      return {
        success: false,
        error: errorData.message || "Failed to subscribe to newsletter",
      }
    }

    strapi.log.info(`[ResendContacts] Added contact ${email} (source: ${source || "unknown"})`)

    return { success: true, data: data as ResendContactResponse }
  } catch (error) {
    strapi.log.error(
      `[ResendContacts] Error adding contact: ${error instanceof Error ? error.message : String(error)}`
    )
    return { success: false, error: "Failed to connect to newsletter service" }
  }
}
