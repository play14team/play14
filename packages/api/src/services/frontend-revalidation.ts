/**
 * Frontend Revalidation Service
 *
 * Triggers on-demand revalidation of Next.js pages when content changes in Strapi.
 * Uses a debounce mechanism to batch rapid changes and prevent excessive API calls.
 *
 * Configuration:
 * - FRONTEND_URL: Base URL of the Next.js frontend (e.g., https://play14.org)
 * - REVALIDATE_SECRET: Shared secret token for authentication
 */

import type { Core } from "@strapi/strapi"

/**
 * Content type to revalidation type mapping
 */
const CONTENT_TYPE_CONFIG: Record<string, { type: string; slugField: string }> = {
  "api::event.event": { type: "event", slugField: "slug" },
  "api::player.player": { type: "player", slugField: "slug" },
  "api::game.game": { type: "game", slugField: "slug" },
  "api::article.article": { type: "article", slugField: "slug" },
  "api::event-location.event-location": { type: "event-location", slugField: "slug" },
}

/**
 * Pending revalidations map for debouncing
 * Key format: "type:slug"
 */
const pendingRevalidations = new Map<string, NodeJS.Timeout>()

/**
 * Debounce time in milliseconds
 * 5 seconds allows batching of bulk edits while still being responsive
 */
const DEBOUNCE_MS = 5000

/**
 * Trigger frontend revalidation for a specific content type and slug
 */
async function triggerRevalidation(
  strapi: Core.Strapi,
  type: string,
  slug: string | undefined
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL
  const revalidateSecret = process.env.REVALIDATE_SECRET

  if (!frontendUrl) {
    strapi.log.warn("[Frontend Revalidation] FRONTEND_URL not configured, skipping")
    return false
  }

  if (!revalidateSecret) {
    strapi.log.warn("[Frontend Revalidation] REVALIDATE_SECRET not configured, skipping")
    return false
  }

  try {
    const response = await fetch(`${frontendUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-token": revalidateSecret,
      },
      body: JSON.stringify({ type, slug }),
    })

    if (response.ok) {
      const result = (await response.json()) as { revalidated?: boolean }
      strapi.log.info(`[Frontend Revalidation] ✅ Revalidated ${type}${slug ? `:${slug}` : ""}`)
      return result.revalidated === true
    }

    const errorText = await response.text()
    strapi.log.error(
      `[Frontend Revalidation] ❌ Failed: ${response.status} ${response.statusText}`,
      errorText
    )
    return false
  } catch (error) {
    // Non-critical failure - log but don't throw
    strapi.log.error("[Frontend Revalidation] ❌ Error:", error)
    return false
  }
}

/**
 * Debounced revalidation trigger
 * Batches multiple rapid changes to the same content into a single revalidation call
 */
function debouncedRevalidation(strapi: Core.Strapi, type: string, slug: string | undefined): void {
  const key = `${type}:${slug || "all"}`

  // Clear existing timeout for this key
  if (pendingRevalidations.has(key)) {
    clearTimeout(pendingRevalidations.get(key))
  }

  // Set new timeout
  const timeoutId = setTimeout(async () => {
    pendingRevalidations.delete(key)
    await triggerRevalidation(strapi, type, slug)
  }, DEBOUNCE_MS)

  pendingRevalidations.set(key, timeoutId)
}

/**
 * Get revalidation config for a content type
 */
export function getRevalidationConfig(
  contentType: string
): { type: string; slugField: string } | null {
  return CONTENT_TYPE_CONFIG[contentType] || null
}

/**
 * Trigger revalidation for a content type change
 * Call this from lifecycle hooks (afterCreate, afterUpdate, afterDelete)
 *
 * @param strapi - Strapi instance
 * @param contentType - Full content type UID (e.g., "api::event.event")
 * @param data - The content data containing the slug
 * @param action - The action that triggered the revalidation (for logging)
 */
export function triggerContentRevalidation(
  strapi: Core.Strapi,
  contentType: string,
  data: Record<string, unknown>,
  action: "create" | "update" | "delete" | "publish" | "unpublish"
): void {
  const config = getRevalidationConfig(contentType)
  if (!config) {
    strapi.log.debug(`[Frontend Revalidation] No config for content type: ${contentType}, skipping`)
    return
  }

  const slug = data[config.slugField] as string | undefined
  strapi.log.debug(
    `[Frontend Revalidation] Scheduling ${action} revalidation for ${config.type}:${slug || "unknown"}`
  )

  debouncedRevalidation(strapi, config.type, slug)
}

/**
 * Trigger revalidation for the home page
 * Call this when content affecting the home page changes
 */
export function triggerHomeRevalidation(strapi: Core.Strapi): void {
  debouncedRevalidation(strapi, "home", undefined)
}

export default {
  getRevalidationConfig,
  triggerContentRevalidation,
  triggerHomeRevalidation,
  triggerRevalidation,
  debouncedRevalidation,
}
