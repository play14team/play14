/**
 * Helpers for recovering from stale-chunk errors after a deployment.
 *
 * When the app is redeployed, its JS chunks get new content hashes and the old
 * files are removed. A browser tab that loaded the app before the deploy still
 * references the old chunk names, so the next client-side navigation throws a
 * `ChunkLoadError` ("Failed to load chunk …"). This is unavoidable in any
 * long-lived SPA — the fix is to detect it and reload once, which fetches fresh
 * HTML pointing at the current chunks.
 */

/** True when an error is a failed dynamic-chunk/CSS load (stale build after deploy). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const { name, message } = error as { name?: string; message?: string }
  if (name === "ChunkLoadError") return true
  return /Loading( CSS)? chunk [\w-]+ failed|Failed to load chunk/i.test(message ?? "")
}

/** Query-param marker carried across the reload so the guard works without storage. */
const RELOAD_PARAM = "_chunkReload"
/** After this long the marker is treated as stale, so a later genuine error can recover. */
const RELOAD_GUARD_MS = 10_000
/** Per-page-load flag; a real reload starts a fresh window so it naturally resets. */
type GuardedWindow = Window & { __play14ChunkReloaded?: boolean }

/** Timestamp of the reload that produced the current page, from the URL marker (0 if none). */
function reloadMarkerTimestamp(): number {
  try {
    const value = new URLSearchParams(window.location.search).get(RELOAD_PARAM)
    return value ? Number(value) : 0
  } catch {
    return 0
  }
}

/**
 * True if we already auto-reloaded recently. Uses an in-memory flag for the
 * current page load AND a URL-param timestamp that survives the reload. The URL
 * marker is deliberately NOT sessionStorage: in sandboxed iframes / strict
 * privacy modes storage throws, and a storage-only guard would let a
 * genuinely-missing chunk reload forever. The marker caps it at one reload.
 */
function reloadGuardActive(): boolean {
  if ((window as GuardedWindow).__play14ChunkReloaded) return true
  const markerTs = reloadMarkerTimestamp()
  return markerTs > 0 && Date.now() - markerTs < RELOAD_GUARD_MS
}

/**
 * Whether `recoverFromChunkError` would reload for this error: a stale-chunk
 * error that isn't already within the reload guard. Pure (no side effects), so
 * an error boundary can use it to decide its initial render without flashing.
 */
export function willRecoverFromChunkError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false
  return !reloadGuardActive()
}

/**
 * If `error` is a stale-chunk error and we haven't just reloaded, force a single
 * full reload to pick up the current build. Returns `true` when a reload was
 * triggered so the caller can render a neutral placeholder instead of an error
 * UI. The reload carries a timestamped URL marker so the guard survives the
 * reload without depending on (possibly-blocked) storage — a genuinely-missing
 * chunk therefore reloads at most once instead of looping.
 */
export function recoverFromChunkError(error: unknown): boolean {
  if (!willRecoverFromChunkError(error))
    return false

    // In-memory flag guards against a same-page-load double reload (e.g. React
    // StrictMode re-running the effect, or multiple boundaries catching the same error).
  ;(window as GuardedWindow).__play14ChunkReloaded = true

  try {
    const url = new URL(window.location.href)
    url.searchParams.set(RELOAD_PARAM, String(Date.now()))
    // replace() — don't add a history entry for the reload.
    window.location.replace(url.toString())
  } catch {
    // URL API unavailable — fall back to a plain reload (in-memory flag still applies).
    window.location.reload()
  }
  return true
}
