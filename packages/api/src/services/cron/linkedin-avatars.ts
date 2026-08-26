/**
 * Report-only audit of player avatars against their LinkedIn profile photo.
 *
 * This task NEVER writes. It answers one question — "which players would
 * `bun run avatars:sync` improve?" — and logs the answer. Applying the change
 * is a deliberate, human-run step (scripts/sync-linkedin-avatars.ts), because:
 *
 * - LinkedIn only serves a member's own photo at 200x200 to unauthenticated
 *   callers, which is *smaller* than the 400x400 avatars uploaded by hand. An
 *   unattended "refresh" job would happily downgrade people.
 * - The Linked API drives a real logged-in browser session that expires. A
 *   writing job would fail silently for weeks; a reporting job just says so.
 * - Copying member photos on a schedule, for people who never asked us to, is
 *   the least defensible version of this. Self-uploads always win.
 *
 * Avatars this repo manages carry a `linkedin:<assetId>` caption. Anything
 * without that marker was uploaded by a human and is reported as `manual`,
 * never as a candidate.
 */

import type { Core } from "@strapi/strapi"

const LINKED_API_BASE = "https://api.linkedapi.io"
const MARKER_PREFIX = "linkedin:"
const DEFAULT_LIMIT = 25
const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 90_000

interface SocialNetwork {
  socialNetworkType?: string
  url?: string
}

interface AvatarFile {
  id: number
  width?: number | null
  height?: number | null
  caption?: string | null
}

interface PlayerRow {
  documentId: string
  name: string
  slug?: string | null
  socialNetworks?: SocialNetwork[] | null
  avatar?: AvatarFile | null
}

export type AvatarFindingReason = "missing" | "stale" | "low-resolution"

export interface AvatarFinding {
  slug: string
  name: string
  linkedinUrl: string
  reason: AvatarFindingReason
  current: string
  candidate: string
}

/** Signals a dead cloud-browser session — worth an error-level log, not a silent skip. */
export class LinkedinSessionError extends Error {}

/**
 * True for `https://linkedin.com/...` and its subdomains, nothing else.
 *
 * `socialNetworks[].url` is a plain string a player edits themselves (see
 * `updateMe` in api/player/controllers/custom-player.ts, which validates
 * `website` but not this), so every consumer must treat it as untrusted input.
 * Without this gate a player could point us at `169.254.169.254` or an internal
 * host and have our tooling fetch it — the asset-id identity check happens too
 * late to help, because the request has already gone out.
 */
export function isLinkedinProfileUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== "https:") return false
  return parsed.hostname === "linkedin.com" || parsed.hostname.endsWith(".linkedin.com")
}

/**
 * LinkedIn renditions are signed per size, so the size lives in the path.
 * Host-pinned: an attacker-controlled page could otherwise serve an `og:image`
 * that merely matches this path shape and have it uploaded as someone's avatar.
 */
export function parsePhotoUrl(url: string): { assetId: string; size: number } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "media.licdn.com") return null
  const asset = parsed.pathname.match(/\/image\/v2\/([^/?]+)\//)
  const size = parsed.pathname.match(/(?:shrink|scale)_(\d+)_\d+/)
  if (!asset || !size) return null
  return { assetId: asset[1], size: Number(size[1]) }
}

/** The asset id a managed avatar was built from, or null for human uploads. */
export function markedAssetId(avatar: AvatarFile | null | undefined): string | null {
  const caption = avatar?.caption
  if (!caption?.startsWith(MARKER_PREFIX)) return null
  return caption.slice(MARKER_PREFIX.length) || null
}

/** The player's LinkedIn profile URL, or null if absent or not actually LinkedIn. */
export function linkedinUrlOf(player: PlayerRow): string | null {
  const entry = (player.socialNetworks ?? []).find(
    (s) => s.socialNetworkType === "LinkedIn" && s.url && isLinkedinProfileUrl(s.url)
  )
  return entry?.url ?? null
}

/**
 * Compare what LinkedIn offers against what we store.
 *
 * `null` means "nothing to do". A human-uploaded avatar always wins, and a
 * same-or-smaller rendition of the same photo is not an improvement.
 */
export function decideFinding(
  player: PlayerRow,
  candidate: { assetId: string; size: number }
): AvatarFindingReason | null {
  const avatar = player.avatar
  if (!avatar) return "missing"

  const marker = markedAssetId(avatar)
  if (!marker) return null // human upload — hands off

  if (marker !== candidate.assetId) return "stale" // they changed their photo
  return (avatar.width ?? 0) < candidate.size ? "low-resolution" : null
}

async function linkedApiRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const response = await fetch(`${LINKED_API_BASE}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      "linked-api-token": process.env.LINKEDAPI_TOKEN ?? "",
      "identification-token": process.env.LINKEDAPI_IDENTIFICATION_TOKEN ?? "",
      client: "play14-avatar-report",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  const payload = (await response.json().catch(() => null)) as {
    result?: T
    error?: { type?: string; message?: string }
  } | null

  const errorType = payload?.error?.type
  if (errorType === "linkedinAccountSignedOut") {
    throw new LinkedinSessionError(
      "LinkedIn account is signed out in the Linked API cloud browser — reconnect it"
    )
  }
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? `Linked API HTTP ${response.status}`)
  }
  if (payload?.result === undefined) throw new Error("Linked API returned no result")
  return payload.result
}

/**
 * Pull the profile photo URL for one person.
 *
 * The workflow response shape is not part of Linked API's stable contract, so
 * rather than walking a documented path we scan the payload for the first
 * `profile-displayphoto` URL. Fewer assumptions, survives response reshuffles.
 */
export async function fetchProfilePhoto(
  personUrl: string
): Promise<{ assetId: string; size: number } | null> {
  const started = await linkedApiRequest<{ workflowId: string }>("/workflows", {
    method: "POST",
    body: { actionType: "st.openPersonPage", personUrl, basicInfo: true },
  })

  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const status = await linkedApiRequest<Record<string, unknown>>(
      `/workflows/${started.workflowId}`,
      { method: "GET" }
    )
    const serialised = JSON.stringify(status)
    if (serialised.includes("profile-displayphoto")) {
      const match = serialised.match(
        /https:\\?\/\\?\/media\.licdn\.com\\?\/[^"\\]*profile-displayphoto[^"\\]*/
      )
      return match ? parsePhotoUrl(match[0].replace(/\\\//g, "/")) : null
    }
    if (typeof status.completion === "object" && status.completion !== null) return null
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return null
}

export async function reportLinkedinAvatarCandidates(
  strapi: Core.Strapi
): Promise<AvatarFinding[]> {
  if (process.env.LINKEDIN_AVATAR_REPORT_ENABLED !== "true") {
    strapi.log.info("[LinkedinAvatars] Skipped (LINKEDIN_AVATAR_REPORT_ENABLED is not true)")
    return []
  }
  if (!process.env.LINKEDAPI_TOKEN || !process.env.LINKEDAPI_IDENTIFICATION_TOKEN) {
    strapi.log.warn("[LinkedinAvatars] Skipped (LINKEDAPI_* tokens are not configured)")
    return []
  }

  // A non-numeric value would become NaN, and slice(0, NaN) yields an empty
  // array — a misconfigured env var would silently report "0 candidates".
  const configuredLimit = Number(process.env.LINKEDIN_AVATAR_REPORT_LIMIT ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : null
  if (limit === null) {
    strapi.log.error(
      `[LinkedinAvatars] Skipped: LINKEDIN_AVATAR_REPORT_LIMIT is not a positive number ` +
        `(got "${process.env.LINKEDIN_AVATAR_REPORT_LIMIT}")`
    )
    return []
  }

  const players = (await strapi.documents("api::player.player").findMany({
    fields: ["name", "slug"],
    populate: ["avatar", "socialNetworks"],
    filters: { visible: { $eq: true } },
    status: "published",
    // A LinkedIn URL lives inside a repeatable component, which the document
    // service cannot filter on — narrow in JS below.
    pagination: { limit: -1 },
  })) as unknown as PlayerRow[]

  const withLinkedin = players.flatMap((player) => {
    const url = linkedinUrlOf(player)
    return url ? [{ player, url }] : []
  })

  const findings: AvatarFinding[] = []
  let checked = 0
  let unreachable = 0
  let manual = 0

  for (const { player, url } of withLinkedin.slice(0, limit)) {
    checked += 1
    let candidate: { assetId: string; size: number } | null
    try {
      candidate = await fetchProfilePhoto(url)
    } catch (error) {
      if (error instanceof LinkedinSessionError) throw error
      // Throttling and auth walls are the normal case, not an incident.
      unreachable += 1
      continue
    }
    if (!candidate) {
      unreachable += 1
      continue
    }

    if (player.avatar && !markedAssetId(player.avatar)) manual += 1

    const reason = decideFinding(player, candidate)
    if (!reason) continue

    const current = player.avatar ? `${player.avatar.width ?? "?"}px` : "none"
    findings.push({
      slug: player.slug ?? player.documentId,
      name: player.name,
      linkedinUrl: url,
      reason,
      current,
      candidate: `${candidate.size}px`,
    })
  }

  strapi.log.info(
    `[LinkedinAvatars] ${withLinkedin.length} players with a LinkedIn URL, ${checked} checked, ` +
      `${findings.length} candidate(s), ${manual} human-uploaded (untouched), ${unreachable} unreachable`
  )
  if (withLinkedin.length > limit) {
    strapi.log.info(
      `[LinkedinAvatars] Capped at ${limit} per run — ${withLinkedin.length - limit} not checked ` +
        "(raise LINKEDIN_AVATAR_REPORT_LIMIT)"
    )
  }
  for (const finding of findings) {
    strapi.log.info(
      `[LinkedinAvatars] ${finding.reason}: ${finding.name} (${finding.slug}) ` +
        `${finding.current} -> ${finding.candidate} available`
    )
  }
  if (findings.length > 0) {
    strapi.log.info(
      "[LinkedinAvatars] Apply with: bun run avatars:sync --only=<slug> (or without --only for all)"
    )
  }

  return findings
}
