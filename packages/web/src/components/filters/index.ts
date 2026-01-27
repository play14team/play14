/**
 * Filter components for inline, same-page filtering
 *
 * @example
 * ```tsx
 * import { FilterBar, useFilters } from '@/components/filters'
 *
 * function EventsPage() {
 *   const { activeFilters, setFilter, clearAllFilters } = useFilters(['status', 'country'])
 *
 *   return (
 *     <FilterBar
 *       filters={[
 *         { id: 'status', label: 'Status', options: statusOptions, displayMode: 'pills' },
 *         { id: 'country', label: 'Country', options: countryOptions, displayMode: 'dropdown' },
 *       ]}
 *       activeFilters={activeFilters}
 *       onFilterChange={setFilter}
 *       onClearAll={clearAllFilters}
 *     />
 *   )
 * }
 * ```
 */

export { default as ActiveFilters } from "./active-filters"
export { default as FilterBar } from "./filter-bar"
export { default as FilterMulti } from "./filter-multi"
export { default as FilterToggle } from "./filter-toggle"
export type {
  ActiveFilters as ActiveFiltersType,
  ActiveFiltersProps,
  FilterBarProps,
  FilterConfig,
  FilterMultiProps,
  FilterOption,
  FilterToggleProps,
  UseFiltersReturn,
} from "./types"
export { useFilters } from "./use-filters"
