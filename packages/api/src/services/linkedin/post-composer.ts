/**
 * LinkedIn post composition service
 * Composes posts from events using Gemini AI
 */

import type { Core } from "@strapi/strapi"
import { createGeminiClient } from "../ai/gemini-client"
import type { EventContext } from "../ai/types"
import { createLogger } from "../observability/logger"
import type { LinkedInPostContent } from "./types"

const log = createLogger("[PostComposer]")

/**
 * Build event context from Strapi event document
 */
function buildEventContext(event: any): EventContext {
  // Select best image (default image or first gallery image)
  let imageUrl: string | undefined

  if (event.defaultImage?.url) {
    imageUrl = event.defaultImage.url
  } else if (event.gallery && event.gallery.length > 0) {
    imageUrl = event.gallery[0].url
  }

  // Build full image URL
  if (imageUrl) {
    const storageUrl = process.env.STORAGE_CDN_URL || process.env.STORAGE_URL
    if (storageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `${storageUrl}${imageUrl}`
    }
  }

  return {
    name: event.name,
    slug: event.slug,
    start: event.start,
    end: event.end,
    location: {
      name: event.location?.name || "TBD",
      city: event.location?.city || "TBD",
      country: event.location?.country || "TBD",
    },
    hosts: event.hosts || [],
    description: event.description,
    imageUrl,
  }
}

/**
 * Compose event announcement post
 */
export async function composeEventAnnouncement(
  strapi: Core.Strapi,
  event: any
): Promise<LinkedInPostContent> {
  log.info("Composing event announcement", { eventSlug: event.slug })

  try {
    const geminiClient = createGeminiClient()
    const eventContext = buildEventContext(event)

    const post = await geminiClient.generateEventAnnouncement(eventContext)

    log.info("Event announcement composed", { eventSlug: event.slug, textLength: post.text.length })

    return post
  } catch (error) {
    log.error("Failed to compose event announcement", { eventSlug: event.slug }, error as Error)
    throw error
  }
}

/**
 * Compose event reminder post
 */
export async function composeEventReminder(
  strapi: Core.Strapi,
  event: any,
  daysUntil: number
): Promise<LinkedInPostContent> {
  log.info("Composing event reminder", { eventSlug: event.slug, daysUntil })

  try {
    const geminiClient = createGeminiClient()
    const eventContext = buildEventContext(event)

    const post =
      daysUntil === 30
        ? await geminiClient.generateReminder30Days(eventContext)
        : await geminiClient.generateReminder7Days(eventContext)

    log.info("Event reminder composed", {
      eventSlug: event.slug,
      daysUntil,
      textLength: post.text.length,
    })

    return post
  } catch (error) {
    log.error(
      "Failed to compose event reminder",
      { eventSlug: event.slug, daysUntil },
      error as Error
    )
    throw error
  }
}
