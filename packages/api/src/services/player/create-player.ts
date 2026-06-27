/**
 * Shared player-creation helper for organizer-driven flows.
 *
 * Several endpoints need to create a standalone (unlinked) player from a name:
 * the admin "create player" action and the event "add participant" new-player
 * path. This centralises the rules they share so they can't drift.
 */

import type { Core } from "@strapi/strapi"
import { toSlug } from "../../libs/strings"

/** Shown when an exact (case-insensitive) name already exists. */
export const PLAYER_NAME_TAKEN_MESSAGE =
  "A player with this name already exists. Select the existing player instead."

/** Shown when a different name collides on the derived slug (e.g. "Rémi" vs "Remi"). */
export const PLAYER_NAME_SIMILAR_MESSAGE =
  "A player with this name (or a very similar one) already exists. Select the existing player instead."

export type CreateUnlinkedPlayerResult =
  | { status: "created"; player: any }
  | { status: "name-exists" }
  | { status: "slug-conflict" }

/**
 * Create a standalone (unlinked) player profile from a name (+ optional company).
 *
 * Encapsulates the rules every organizer-driven create shares:
 * - rejects an exact (case-insensitive) name match → `{ status: "name-exists" }`
 * - sets `slug = toSlug(name)` because Strapi 5 validates the required `slug`
 *   field BEFORE the `beforeCreate` lifecycle runs, so the lifecycle can't
 *   satisfy validation — the create must carry a slug (the value matches what
 *   the lifecycle would derive, so they agree)
 * - maps a unique-constraint violation (e.g. diacritic-equivalent names that
 *   slugify identically) to `{ status: "slug-conflict" }` instead of a 500
 *
 * Genuine (non-uniqueness) errors are rethrown for the caller to handle. Does
 * NOT link a user, send an invite, or email — callers own enrollment.
 *
 * @param name - already-trimmed player name (callers validate length up front)
 */
export async function createUnlinkedPlayer(
  strapi: Core.Strapi,
  { name, company }: { name: string; company?: unknown }
): Promise<CreateUnlinkedPlayerResult> {
  // player.name is unique — reject exact matches so the organizer picks the existing one.
  const existing = await strapi.documents("api::player.player").findMany({
    filters: { name: { $eqi: name } },
    fields: ["documentId"],
  })
  if (existing.length > 0) return { status: "name-exists" }

  const companyValue = typeof company === "string" && company.trim() ? company.trim() : null

  try {
    const player = await strapi.documents("api::player.player").create({
      data: {
        name,
        slug: toSlug(name),
        company: companyValue,
        position: "Player",
      } as any,
    })
    return { status: "created", player }
  } catch (err) {
    if (/unique|duplicate|already exists/i.test(String(err))) {
      strapi.log.warn(`[Player] Name/slug conflict creating player "${name}": ${err}`)
      return { status: "slug-conflict" }
    }
    throw err
  }
}
