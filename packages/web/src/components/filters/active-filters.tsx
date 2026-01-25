"use client"

import type { ActiveFiltersProps } from "./types"

/**
 * Displays currently active filters as removable chips
 *
 * @example
 * ```tsx
 * <ActiveFilters
 *   filters={filterConfigs}
 *   activeFilters={{ country: ['fr', 'de'], status: ['Open'] }}
 *   onRemove={(filterId, value) => removeFilter(filterId, value)}
 *   onClearAll={() => clearAllFilters()}
 * />
 * ```
 */
export default function ActiveFilters({
  filters,
  activeFilters,
  onRemove,
  onClearAll,
}: ActiveFiltersProps) {
  // Build list of active filter items with labels
  const activeItems: Array<{
    filterId: string
    value: string
    label: string
    icon?: React.ReactNode
  }> = []

  for (const filter of filters) {
    const selectedValues = activeFilters[filter.id] || []
    for (const value of selectedValues) {
      const option = filter.options.find((opt) => opt.value === value)
      if (option) {
        activeItems.push({
          filterId: filter.id,
          value,
          label: option.label,
          icon: option.icon,
        })
      }
    }
  }

  // Don't render if no active filters
  if (activeItems.length === 0) {
    return null
  }

  return (
    <div className="active-filters">
      <span className="active-filters-label">Active:</span>
      {activeItems.map((item) => (
        <span key={`${item.filterId}-${item.value}`} className="active-filter-chip">
          {item.icon && <span className="active-filter-chip-icon">{item.icon}</span>}
          <span>{item.label}</span>
          <button
            type="button"
            onClick={() => onRemove(item.filterId, item.value)}
            aria-label={`Remove ${item.label} filter`}
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="clear-all-btn"
        onClick={onClearAll}
        aria-label="Clear all filters"
      >
        Clear all
      </button>
    </div>
  )
}
