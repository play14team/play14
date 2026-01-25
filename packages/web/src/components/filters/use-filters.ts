"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"
import type { ActiveFilters, UseFiltersReturn } from "./types"

/**
 * Parse comma-separated values from URL param
 */
function parseValues(value: string | null): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * Serialize array to comma-separated URL param value
 * Uses Set to guarantee no duplicates
 */
function serializeValues(values: string[]): string | null {
  // Use Set to remove duplicates, then filter empty values
  const unique = Array.from(new Set(values)).filter(Boolean)
  return unique.length > 0 ? unique.join(",") : null
}

/**
 * Hook for managing filter state via URL search params
 *
 * Provides shareable, bookmarkable URLs and browser back/forward support.
 *
 * @param filterIds - Array of filter IDs to track
 * @returns Filter state and update functions
 *
 * @example
 * ```tsx
 * const { activeFilters, setFilter, clearAllFilters } = useFilters(['country', 'status'])
 *
 * // URL: /events?country=fr,de&status=Open
 * // activeFilters: { country: ['fr', 'de'], status: ['Open'] }
 * ```
 */
export function useFilters(filterIds: string[]): UseFiltersReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Create stable key from filterIds to avoid recreating on every render
  const filterIdsKey = filterIds.join(",")

  // Parse current filters from URL
  const activeFilters = useMemo<ActiveFilters>(() => {
    const filters: ActiveFilters = {}
    for (const id of filterIds) {
      filters[id] = parseValues(searchParams.get(id))
    }
    return filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterIdsKey, searchParams])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some((values) => values.length > 0)
  }, [activeFilters])

  // Update URL with new params (preserves other params)
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      // Build new URL
      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      // Use replace to avoid adding to history for every filter change
      // Use push for more significant navigation
      router.replace(newUrl, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  // Set filter values (replaces existing values for that filter)
  const setFilter = useCallback(
    (filterId: string, values: string[]) => {
      updateUrl({ [filterId]: serializeValues(values) })
    },
    [updateUrl]
  )

  // Remove a specific value from a filter
  const removeFilter = useCallback(
    (filterId: string, value: string) => {
      const currentValues = activeFilters[filterId] || []
      const newValues = currentValues.filter((v) => v !== value)
      setFilter(filterId, newValues)
    },
    [activeFilters, setFilter]
  )

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const updates: Record<string, null> = {}
    for (const id of filterIds) {
      updates[id] = null
    }
    updateUrl(updates)
  }, [filterIds, updateUrl])

  return {
    activeFilters,
    setFilter,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
  }
}
