"use client"

import { useState, useEffect, useCallback } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface ToggleOption {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export interface EventFilterBarProps {
  // Filter tabs (optional)
  filters?: FilterOption[]
  activeFilter?: string
  onFilterChange?: (value: string) => void

  // Toggle options (optional checkboxes)
  toggles?: ToggleOption[]

  // Search (optional)
  searchEnabled?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  isSearching?: boolean

  // Count display
  totalCount?: number
  filteredCount?: number
  countLabel?: string // e.g., "events", "claims"
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EventFilterBar({
  filters,
  activeFilter,
  onFilterChange,
  toggles,
  searchEnabled = false,
  searchPlaceholder = "Search...",
  searchValue: externalSearchValue,
  onSearchChange,
  isSearching = false,
  totalCount,
  filteredCount,
  countLabel = "events",
}: EventFilterBarProps) {
  // Local search state for debouncing
  const [localSearch, setLocalSearch] = useState(externalSearchValue || "")

  // Sync with external value
  useEffect(() => {
    if (externalSearchValue !== undefined) {
      setLocalSearch(externalSearchValue)
    }
  }, [externalSearchValue])

  // Debounced search callback
  const debouncedSearch = useCallback(
    (value: string) => {
      onSearchChange?.(value)
    },
    [onSearchChange]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== externalSearchValue) {
        debouncedSearch(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, externalSearchValue, debouncedSearch])

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value)
  }

  const clearSearch = () => {
    setLocalSearch("")
    onSearchChange?.("")
  }

  // Build count string
  const getCountDisplay = () => {
    if (filteredCount === undefined && totalCount === undefined) return null

    const count = filteredCount ?? totalCount ?? 0
    const label = count === 1 ? countLabel.replace(/s$/, "") : countLabel

    if (filteredCount !== undefined && totalCount !== undefined && filteredCount !== totalCount) {
      return `${filteredCount} ${label} (${totalCount} total)`
    }

    return `${count} ${label}`
  }

  const countDisplay = getCountDisplay()
  const hasFilters = filters && filters.length > 0
  const hasToggles = toggles && toggles.length > 0
  const hasSearch = searchEnabled

  if (!hasFilters && !hasToggles && !hasSearch && !countDisplay) {
    return null
  }

  return (
    <div className="event-filter-bar">
      <div className="event-filter-bar-left">
        {/* Search Input */}
        {hasSearch && (
          <div className="event-filter-search">
            <div className="event-filter-search-input-wrapper">
              <i className="bx bx-search event-filter-search-icon"></i>
              <input
                type="text"
                className="event-filter-search-input"
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={handleSearchInput}
              />
              {isSearching && (
                <i className="bx bx-loader-alt bx-spin event-filter-search-loading"></i>
              )}
              {localSearch && !isSearching && (
                <button
                  type="button"
                  className="event-filter-search-clear"
                  onClick={clearSearch}
                  title="Clear search"
                >
                  <i className="bx bx-x"></i>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {hasFilters && (
          <div className="event-filter-tabs">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`event-filter-tab ${activeFilter === filter.value ? "active" : ""}`}
                onClick={() => onFilterChange?.(filter.value)}
              >
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span className="event-filter-tab-badge">{filter.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Toggle Options */}
        {hasToggles && (
          <div className="event-filter-toggles">
            {toggles.map((toggle) => (
              <label key={toggle.id} className="event-filter-toggle">
                <input
                  type="checkbox"
                  checked={toggle.checked}
                  onChange={(e) => toggle.onChange(e.target.checked)}
                />
                <span className="event-filter-toggle-switch" />
                <span className="event-filter-toggle-label">{toggle.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Count Display */}
      {countDisplay && (
        <div className="event-filter-count">{countDisplay}</div>
      )}
    </div>
  )
}
