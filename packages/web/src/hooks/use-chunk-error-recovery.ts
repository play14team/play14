"use client"

import { useEffect, useState } from "react"
import {
  isChunkLoadError,
  recoverFromChunkError,
  willRecoverFromChunkError,
} from "@/libs/chunk-error"

/**
 * For use inside an error boundary (`error.tsx` / `global-error.tsx`).
 *
 * Auto-reloads once when the boundary catches a stale-chunk error after a
 * deployment (see `@/libs/chunk-error`). Returns `true` while a reload is
 * pending so the boundary can render a neutral placeholder instead of flashing
 * an error UI. Genuine (non-chunk) errors are logged and surfaced as normal.
 */
export function useChunkErrorRecovery(error: unknown): boolean {
  // Initialise to whether a reload will actually fire, so we never flash the error UI
  // before reloading — nor flash the spinner when the reload is guard-suppressed.
  const [reloading, setReloading] = useState(() => willRecoverFromChunkError(error))

  useEffect(() => {
    if (recoverFromChunkError(error)) {
      setReloading(true)
      return
    }
    // A chunk error that didn't trigger a reload means recovery already fired (the
    // guard is active — e.g. React StrictMode re-running this effect, or a prior
    // reload). Don't log it or flash the error UI; the reload is in flight.
    if (isChunkLoadError(error)) return
    setReloading(false)
    console.error(error)
  }, [error])

  return reloading
}
