"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Serializes form values to a stable format for comparison.
 * This ensures we can reliably detect changes.
 */
function serializeFormValues(values: unknown): string {
  return JSON.stringify(values, (_, value) => {
    // Handle dates
    if (value instanceof Date) {
      return value.toISOString()
    }
    return value
  })
}

export interface UseFormDirtyOptions {
  /** Called when dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void
}

export interface UseFormDirtyReturn {
  /** Whether the form has unsaved changes */
  isDirty: boolean
  /** Reset the baseline to current values (call after save) or to specific values (call after discard) */
  resetDirtyState: (newBaseline?: unknown) => void
  /** Manually mark form as clean */
  markClean: () => void
}

/**
 * Hook to track whether a form has unsaved changes.
 *
 * @param currentValues - Current form values object
 * @param options - Optional configuration
 * @returns Dirty state and reset functions
 *
 * @example
 * ```tsx
 * const { isDirty, resetDirtyState } = useFormDirty({
 *   name,
 *   description,
 *   startDate,
 * })
 *
 * // After successful save:
 * resetDirtyState()
 * ```
 */
export function useFormDirty<T extends object>(
  currentValues: T,
  options: UseFormDirtyOptions = {}
): UseFormDirtyReturn {
  const { onDirtyChange } = options

  // Lazy initialization: compute the initial value only once
  const [initialSerialized] = useState<string>(() => serializeFormValues(currentValues))

  // Use a ref to store the baseline for comparison (can be reset)
  const baselineRef = useRef<string>(initialSerialized)

  // Track dirty state
  const [isDirty, setIsDirty] = useState(false)

  // Update dirty state when current values change
  useEffect(() => {
    const currentSerialized = serializeFormValues(currentValues)
    const dirty = currentSerialized !== baselineRef.current
    setIsDirty(dirty)
  }, [currentValues])

  // Notify on dirty state change
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Reset to current values as the new baseline, or to specific values if provided
  const resetDirtyState = useCallback(
    (newBaseline?: unknown) => {
      const serialized = serializeFormValues(newBaseline ?? currentValues)
      baselineRef.current = serialized
      setIsDirty(false)
    },
    [currentValues]
  )

  // Mark form as clean without changing initial values
  const markClean = useCallback(() => {
    const currentSerialized = serializeFormValues(currentValues)
    baselineRef.current = currentSerialized
    setIsDirty(false)
  }, [currentValues])

  return {
    isDirty,
    resetDirtyState,
    markClean,
  }
}

/**
 * Hook to warn users when they try to leave a page with unsaved changes.
 * Uses the browser's beforeunload event.
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Warning message (note: browsers may not show custom messages)
 */
export function useBeforeUnload(
  isDirty: boolean,
  message = "You have unsaved changes. Are you sure you want to leave?"
): void {
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers require returnValue to be set
      e.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty, message])
}
