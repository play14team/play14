#!/usr/bin/env bun
/**
 * Fill in player avatars from their LinkedIn profile photo.
 *
 * Run by hand (never on a schedule — see packages/api/src/services/cron/
 * linkedin-avatars.ts for why), typically after adding player records:
 *
 *   bun run avatars:sync -- --dry-run
 *   bun run avatars:sync -- --only=danny-tong
 *   bun run avatars:sync -- --limit=5
 *   bun run avatars:sync -- --url=https://api.play14.org --token-file=./strapi.token
 *
 * Requires:
 *   STRAPI_URL           e.g. https://api.play14.org  (or --url=)
 *   STRAPI_API_TOKEN     content-API token: player find+update, upload create+destroy
 *                        (or --token-file=<path> — a file holding just the token)
 *   the `linkedin` CLI, authenticated (`linkedin setup`)
 *
 * There is deliberately no `--token=` flag: an argument lands in shell history
 * and in `ps` output for every user on the box. Pass a file, or use the env var.
 *
 * Two rules keep this safe:
 *   1. IDENTITY — a candidate photo is only accepted if its media asset id
 *      matches the asset id LinkedIn reports for that very profile. Public
 *      profile pages embed 400x400 photos of *other* people (suggested
 *      profiles); picking "the biggest image on the page" attaches strangers'
 *      faces to your players. Ask me how I know.
 *   2. OWNERSHIP — avatars this script uploads carry a `linkedin:<assetId>`
 *      caption. Anything without that marker was uploaded by a human and is
 *      never touched, never replaced, never deleted.
 */

export {}

const MARKER_PREFIX = "linkedin:"
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
const REQUEST_SPACING_MS = 2_000

interface AvatarFile {
  id: number
  width?: number | null
  caption?: string | null
}

interface Player {
  documentId: string
  name: string
  slug?: string | null
  avatar?: AvatarFile | null
  socialNetworks?: Array<{ socialNetworkType?: string; url?: string }> | null
}

interface Photo {
  url: string
  assetId: string
  size: number
}

// Mirrors the pure helpers in packages/api/src/services/cron/linkedin-avatars.ts.
// Duplicated rather than imported: that module is inside the api package and
// pulls Strapi types. Keep the two in step if the marker format changes.
function parsePhotoUrl(url: string): Photo | null {
  const asset = url.match(/\/image\/v2\/([^/?]+)\//)
  const size = url.match(/(?:shrink|scale)_(\d+)_\d+/)
  if (!asset || !size) return null
  return { url, assetId: asset[1], size: Number(size[1]) }
}

function markedAssetId(avatar: AvatarFile | null | undefined): string | null {
  const caption = avatar?.caption
  if (!caption?.startsWith(MARKER_PREFIX)) return null
  return caption.slice(MARKER_PREFIX.length) || null
}

const args = process.argv.slice(2)
const flag = (name: string): string | undefined =>
  args
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=")
const dryRun = args.includes("--dry-run")
const only = flag("only")
const limit = Number(flag("limit") ?? Number.POSITIVE_INFINITY)

const tokenFile = flag("token-file")
const strapiUrl = (flag("url") ?? process.env.STRAPI_URL ?? "").replace(/\/$/, "")
const apiToken = tokenFile
  ? (
      await Bun.file(tokenFile)
        .text()
        .catch(() => "")
    ).trim()
  : (process.env.STRAPI_API_TOKEN ?? "")
if (!strapiUrl || !apiToken) {
  console.error(
    "Missing Strapi credentials. Set STRAPI_URL and STRAPI_API_TOKEN, " +
      "or pass --url=<base-url> and --token-file=<path>." +
      (tokenFile ? ` (could not read a token from ${tokenFile})` : "")
  )
  process.exit(1)
}

const authHeaders = { Authorization: `Bearer ${apiToken}`, "User-Agent": BROWSER_UA }

async function strapi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${strapiUrl}${path}`, {
    ...init,
    headers: { ...authHeaders, ...(init.headers ?? {}) },
  })
  const text = await response.text()
  if (!response.ok)
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${text}`)
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

async function listPlayers(): Promise<Player[]> {
  const players: Player[] = []
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      "filters[visible][$eq]": "true",
      "populate[avatar]": "true",
      "populate[socialNetworks]": "true",
      "pagination[page]": String(page),
      "pagination[pageSize]": "100",
    })
    const body = await strapi<{ data: Player[]; meta: { pagination: { pageCount: number } } }>(
      `/api/players?${query}`
    )
    players.push(...body.data)
    if (page >= (body.meta?.pagination?.pageCount ?? 1)) return players
  }
}

/** The profile's own photo, straight from the Linked API — small, but authoritative. */
function fetchViaCli(profileUrl: string): Photo | null {
  const proc = Bun.spawnSync({
    cmd: ["linkedin", "person", "fetch", profileUrl, "--json", "-q"],
    stdout: "pipe",
    stderr: "pipe",
  })
  const raw = new TextDecoder().decode(proc.stdout)
  if (!raw.trim()) return null
  let parsed: { success?: boolean; data?: { avatarUrl?: string | null } }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed.success || !parsed.data?.avatarUrl) return null
  return parsePhotoUrl(parsed.data.avatarUrl)
}

/**
 * Try for a larger rendition via the public page's og:image, which is the
 * owner's photo (usually 200x200). Rejected unless the asset id matches what
 * the CLI reported for this profile. LinkedIn answers 999/auth-wall often —
 * that is a skip, not a failure.
 */
async function fetchOgUpgrade(profileUrl: string, expectedAssetId: string): Promise<Photo | null> {
  let html: string
  try {
    const response = await fetch(profileUrl, { headers: { "User-Agent": BROWSER_UA } })
    if (!response.ok) return null
    html = await response.text()
  } catch {
    return null
  }
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
  if (!og) return null
  const photo = parsePhotoUrl(og[1].replace(/&amp;/g, "&"))
  return photo && photo.assetId === expectedAssetId ? photo : null
}

async function uploadPhoto(photo: Photo, player: Player): Promise<AvatarFile> {
  const image = await fetch(photo.url, { headers: { "User-Agent": BROWSER_UA } })
  if (!image.ok) throw new Error(`photo download -> ${image.status}`)
  const bytes = await image.arrayBuffer()

  const form = new FormData()
  form.append(
    "files",
    new Blob([bytes], { type: "image/jpeg" }),
    `${player.slug ?? player.documentId}-${photo.size}.jpeg`
  )
  form.append(
    "fileInfo",
    JSON.stringify({
      caption: `${MARKER_PREFIX}${photo.assetId}`,
      alternativeText: `${player.name} profile photo`,
    })
  )
  const uploaded = await strapi<AvatarFile[]>("/api/upload", { method: "POST", body: form })
  return uploaded[0]
}

type Outcome = "uploaded" | "would-upload" | "up-to-date" | "manual" | "unreachable" | "failed"

const results: Array<{ player: string; outcome: Outcome; detail: string }> = []

const candidates = (await listPlayers())
  .map((player) => ({
    player,
    profileUrl: (player.socialNetworks ?? []).find(
      (s) => s.socialNetworkType === "LinkedIn" && s.url
    )?.url,
  }))
  .filter((entry): entry is { player: Player; profileUrl: string } => Boolean(entry.profileUrl))
  .filter((entry) => !only || entry.player.slug === only)
  .slice(0, limit)

console.log(
  `${candidates.length} player(s) with a LinkedIn URL${dryRun ? " (dry run — no writes)" : ""}\n`
)

for (const [index, { player, profileUrl }] of candidates.entries()) {
  const label = player.slug ?? player.documentId
  const current = player.avatar

  if (current && !markedAssetId(current)) {
    results.push({ player: label, outcome: "manual", detail: "human upload, left alone" })
    continue
  }

  if (index > 0) await Bun.sleep(REQUEST_SPACING_MS)

  const baseline = fetchViaCli(profileUrl)
  if (!baseline) {
    results.push({ player: label, outcome: "unreachable", detail: "no photo from Linked API" })
    continue
  }

  const upgrade = await fetchOgUpgrade(profileUrl, baseline.assetId)
  const best = upgrade && upgrade.size > baseline.size ? upgrade : baseline

  const sameAsset = markedAssetId(current) === best.assetId
  const noGain = sameAsset && (current?.width ?? 0) >= best.size
  if (noGain) {
    results.push({
      player: label,
      outcome: "up-to-date",
      detail: `${current?.width}px, LinkedIn offers ${best.size}px`,
    })
    continue
  }

  const detail = `${current ? `${current.width}px` : "none"} -> ${best.size}px (${best.assetId})`
  if (dryRun) {
    results.push({ player: label, outcome: "would-upload", detail })
    continue
  }

  try {
    const file = await uploadPhoto(best, player)
    await strapi(`/api/players/${player.documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { avatar: file.id } }),
    })
    // Only ever delete a file this script uploaded.
    if (current && markedAssetId(current)) {
      await strapi(`/api/upload/files/${current.id}`, { method: "DELETE" }).catch(() => {})
    }
    results.push({ player: label, outcome: "uploaded", detail })
  } catch (error) {
    results.push({
      player: label,
      outcome: "failed",
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

const width = Math.max(6, ...results.map((r) => r.player.length))
for (const r of results) {
  console.log(`${r.player.padEnd(width)}  ${r.outcome.padEnd(13)} ${r.detail}`)
}

const tally = results.reduce<Record<string, number>>((acc, r) => {
  acc[r.outcome] = (acc[r.outcome] ?? 0) + 1
  return acc
}, {})
console.log(
  `\n${Object.entries(tally)
    .map(([k, v]) => `${v} ${k}`)
    .join(", ")}`
)
if (tally.failed) process.exit(1)
