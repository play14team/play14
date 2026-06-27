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

const RELOAD_GUARD_KEY = "play14:chunk-reload-at"
/** Don't auto-reload more than once per window — if the chunk is truly gone, show the error. */
const RELOAD_GUARD_MS = 10_000
/** Per-page-load flag; a real reload starts a fresh window so it naturally resets. */
type GuardedWindow = Window & { __play14ChunkReloaded?: boolean }

/** True if a reload happened recently (within this page load OR the guard window). */
function reloadGuardActive(): boolean {
  if ((window as GuardedWindow).__play14ChunkReloaded) return true
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0")
    return Date.now() - last < RELOAD_GUARD_MS
  } catch {
    // sessionStorage inaccessible (SecurityError in sandboxed/strict contexts) — fall back
    // to the in-memory flag above, which still prevents a same-page-load reload loop.
    return false
  }
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
 * UI. Guarded two ways so it can't loop: an in-memory flag (survives even when
 * storage is blocked) and a sessionStorage timestamp (survives across reloads).
 */
export function recoverFromChunkError(error: unknown): boolean {
  if (!willRecoverFromChunkError(error))
    return false

    // Set the in-memory flag first so a blocked sessionStorage can't cause a loop.
  ;(window as GuardedWindow).__play14ChunkReloaded = true
  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // Best effort — the in-memory flag is the backstop within this page load.
  }

  window.location.reload()
  return true
}
