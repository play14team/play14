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

/**
 * If `error` is a stale-chunk error, force a single full reload to pick up the
 * current build. Returns `true` when a reload was triggered so the caller can
 * render a neutral placeholder instead of an error UI. Guarded by sessionStorage
 * so a genuinely-missing chunk can't cause an infinite reload loop.
 */
export function recoverFromChunkError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false

  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0")
    if (Date.now() - last < RELOAD_GUARD_MS) return false
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (private mode / disabled) — reload anyway; the
    // worst case is the browser's own back-stop against reload loops.
  }

  window.location.reload()
  return true
}
