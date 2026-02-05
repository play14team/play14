/**
 * Newsletter subscription controller
 *
 * Handles newsletter subscription requests by adding subscribers
 * to the Sender.net newsletter group.
 */

import type { Core } from "@strapi/strapi"
import { addSubscriberToGroup } from "../../../services/sender-subscribers"

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Subscribe to the newsletter
   *
   * Request body:
   * - email: string (required) - Email address to subscribe
   * - firstName: string (optional) - Subscriber's first name
   * - source: string (optional) - Where the subscription came from (e.g., "footer")
   */
  async subscribe(ctx) {
    const { email, firstName, source } = ctx.request.body || {}

    // Validate email
    if (!email || typeof email !== "string") {
      return ctx.badRequest("Email is required")
    }

    const trimmedEmail = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return ctx.badRequest("Please enter a valid email address")
    }

    // Validate firstName if provided
    const trimmedFirstName = firstName?.trim() || undefined
    if (trimmedFirstName && trimmedFirstName.length > 100) {
      return ctx.badRequest("First name is too long")
    }

    // Validate source if provided
    const trimmedSource = source?.trim() || undefined
    if (trimmedSource && trimmedSource.length > 50) {
      return ctx.badRequest("Invalid source")
    }

    // Add subscriber to Sender.net group
    const result = await addSubscriberToGroup(trimmedEmail, trimmedFirstName, trimmedSource)

    if (!result.success) {
      strapi.log.warn(`[Newsletter] Subscription failed for ${trimmedEmail}: ${result.error}`)
      return ctx.badRequest(result.error || "Failed to subscribe")
    }

    strapi.log.info(
      `[Newsletter] New subscription: ${trimmedEmail} (source: ${trimmedSource || "unknown"})`
    )

    return ctx.send({
      data: {
        success: true,
        message: "Successfully subscribed to newsletter",
      },
    })
  },
})
