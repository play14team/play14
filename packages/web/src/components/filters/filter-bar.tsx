"use client"

import ActiveFilters from "./active-filters"
import FilterMulti from "./filter-multi"
import FilterToggle from "./filter-toggle"
import type { FilterBarProps, FilterConfig } from "./types"

/**
 * Determines how to display a filter based on configuration and option count
 */
function getDisplayMode(filter: FilterConfig): "pills" | "dropdown" {
  if (filter.displayMode === "pills") return "pills"
  if (filter.displayMode === "dropdown") return "dropdown"

  // Auto mode: use pills for small sets, dropdown for large sets
  const threshold = filter.autoThreshold ?? 6
  return filter.options.length < threshold ? "pills" : "dropdown"
}

/**
 * Main filter bar component that renders multiple filter groups
 *
 * Automatically chooses between pills (ToggleGroup) and dropdown (Popover)
 * based on the number of options or explicit displayMode configuration.
 *
 * @example
 * ```tsx
 * <FilterBar
 *   filters={[
 *     { id: 'status', label: 'Status', options: statusOptions, displayMode: 'pills' },
 *     { id: 'country', label: 'Country', options: countryOptions, displayMode: 'dropdown' },
 *   ]}
 *   activeFilters={{ status: ['Open'], country: ['fr'] }}
 *   onFilterChange={(id, values) => setFilter(id, values)}
 *   onClearAll={() => clearAllFilters()}
 *   totalCount={150}
 *   filteredCount={42}
 *   countLabel="events"
 * />
 * ```
 */
export default function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  totalCount,
  filteredCount,
  countLabel = "items",
  className,
}: FilterBarProps) {
  // Check if any filters are active
  const hasActiveFilters = Object.values(activeFilters).some((values) => values.length > 0)

  // Build count display string
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

  return (
    <div className={`filter-bar ${className || ""}`}>
      <div className="filter-bar-controls">
        {filters.map((filter) => {
          const displayMode = getDisplayMode(filter)
          const selectedValues = activeFilters[filter.id] || []

          if (displayMode === "pills") {
            return (
              <FilterToggle
                key={filter.id}
                filter={filter}
                value={selectedValues}
                onChange={(values) => onFilterChange(filter.id, values)}
              />
            )
          }

          return (
            <FilterMulti
              key={filter.id}
              filter={filter}
              value={selectedValues}
              onChange={(values) => onFilterChange(filter.id, values)}
            />
          )
        })}

        {/* Count display */}
        {countDisplay && <div className="filter-count">{countDisplay}</div>}
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <ActiveFilters
          filters={filters}
          activeFilters={activeFilters}
          onRemove={(filterId, value) => {
            const currentValues = activeFilters[filterId] || []
            onFilterChange(
              filterId,
              currentValues.filter((v) => v !== value)
            )
          }}
          onClearAll={onClearAll}
        />
      )}
    </div>
  )
}
