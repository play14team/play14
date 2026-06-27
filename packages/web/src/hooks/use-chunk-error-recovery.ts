"use client"

import { useEffect, useState } from "react"
import { isChunkLoadError, recoverFromChunkError } from "@/libs/chunk-error"

/**
 * For use inside an error boundary (`error.tsx` / `global-error.tsx`).
 *
 * Auto-reloads once when the boundary catches a stale-chunk error after a
 * deployment (see `@/libs/chunk-error`). Returns `true` while a reload is
 * pending so the boundary can render a neutral placeholder instead of flashing
 * an error UI. Genuine (non-chunk) errors are logged and surfaced as normal.
 */
export function useChunkErrorRecovery(error: unknown): boolean {
  // Start in the reloading state for a chunk error so we never flash the error UI.
  const [reloading, setReloading] = useState(() => isChunkLoadError(error))

  useEffect(() => {
    if (recoverFromChunkError(error)) {
      setReloading(true)
      return
    }
    setReloading(false)
    // Log only errors we're actually surfacing (a reloaded chunk error is expected).
    console.error(error)
  }, [error])

  return reloading
}
