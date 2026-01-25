/**
 * Filter system types
 *
 * These types define the structure for the inline filter components
 * used across events, players, games, and articles pages.
 */

import type { ReactNode } from "react"

/**
 * A single filter option (e.g., "France" in country filter)
 */
export interface FilterOption {
  /** Unique value used in URL params */
  value: string
  /** Display label */
  label: string
  /** Optional count of items matching this option */
  count?: number
  /** Optional icon (e.g., country flag component) */
  icon?: ReactNode
}

/**
 * Configuration for a filter category (e.g., "Country", "Status")
 */
export interface FilterConfig {
  /** Unique identifier used in URL params */
  id: string
  /** Display label for the filter */
  label: string
  /** Icon class (boxicons) */
  icon?: string
  /** Available options */
  options: FilterOption[]
  /** Allow multiple selections (default: true) */
  multiSelect?: boolean
  /** How to display: pills for small sets, dropdown for large sets */
  displayMode?: "pills" | "dropdown" | "auto"
  /** Threshold for auto mode (default: 6) */
  autoThreshold?: number
}

/**
 * Currently active filter selections
 * Key is filter id, value is array of selected values
 */
export type ActiveFilters = Record<string, string[]>

/**
 * Props for the main FilterBar component
 */
export interface FilterBarProps {
  /** Filter configurations */
  filters: FilterConfig[]
  /** Currently active filter values */
  activeFilters: ActiveFilters
  /** Callback when filters change */
  onFilterChange: (filterId: string, values: string[]) => void
  /** Callback to clear all filters */
  onClearAll: () => void
  /** Total count of items (unfiltered) */
  totalCount?: number
  /** Filtered count of items */
  filteredCount?: number
  /** Label for count display (e.g., "events", "players") */
  countLabel?: string
  /** Additional CSS class */
  className?: string
}

/**
 * Props for FilterToggle component (pill-style using Radix ToggleGroup)
 */
export interface FilterToggleProps {
  /** Filter configuration */
  filter: FilterConfig
  /** Currently selected values */
  value: string[]
  /** Callback when selection changes */
  onChange: (values: string[]) => void
}

/**
 * Props for FilterMulti component (dropdown multi-select)
 */
export interface FilterMultiProps {
  /** Filter configuration */
  filter: FilterConfig
  /** Currently selected values */
  value: string[]
  /** Callback when selection changes */
  onChange: (values: string[]) => void
  /** Placeholder for search input */
  searchPlaceholder?: string
}

/**
 * Props for ActiveFilters display component
 */
export interface ActiveFiltersProps {
  /** Filter configurations (for labels) */
  filters: FilterConfig[]
  /** Currently active filter values */
  activeFilters: ActiveFilters
  /** Callback to remove a single filter value */
  onRemove: (filterId: string, value: string) => void
  /** Callback to clear all filters */
  onClearAll: () => void
}

/**
 * Return type for useFilters hook
 */
export interface UseFiltersReturn {
  /** Current active filters from URL */
  activeFilters: ActiveFilters
  /** Update a single filter's values */
  setFilter: (filterId: string, values: string[]) => void
  /** Remove a specific value from a filter */
  removeFilter: (filterId: string, value: string) => void
  /** Clear all filters */
  clearAllFilters: () => void
  /** Check if any filters are active */
  hasActiveFilters: boolean
}
