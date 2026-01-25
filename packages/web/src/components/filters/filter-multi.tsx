"use client"

import * as Checkbox from "@radix-ui/react-checkbox"
import * as Popover from "@radix-ui/react-popover"
import { useCallback, useMemo, useState } from "react"
import type { FilterMultiProps } from "./types"

/**
 * Filter component using Radix Popover with checkboxes for multi-select dropdown
 *
 * Best for filter categories with many options (>= 6) like Country, Location, Tags.
 * Includes search functionality for large option sets.
 *
 * @example
 * ```tsx
 * <FilterMulti
 *   filter={{
 *     id: 'country',
 *     label: 'Country',
 *     options: [
 *       { value: 'fr', label: 'France', count: 12, icon: <Flag code="FR" /> },
 *       { value: 'de', label: 'Germany', count: 8, icon: <Flag code="DE" /> },
 *     ],
 *   }}
 *   value={['fr', 'de']}
 *   onChange={(values) => setFilter('country', values)}
 * />
 * ```
 */
export default function FilterMulti({
  filter,
  value,
  onChange,
  searchPlaceholder = "Search...",
}: FilterMultiProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return filter.options
    const searchLower = search.toLowerCase()
    return filter.options.filter((option) => option.label.toLowerCase().includes(searchLower))
  }, [filter.options, search])

  // Handle checkbox change - use Set to guarantee no duplicates
  const handleCheckedChange = useCallback(
    (optionValue: string, checked: boolean) => {
      // Use Set operations to guarantee uniqueness
      const currentSet = new Set(value)
      if (checked) {
        currentSet.add(optionValue)
      } else {
        currentSet.delete(optionValue)
      }
      onChange(Array.from(currentSet))
    },
    [value, onChange]
  )

  // Check if option is selected
  const isSelected = useCallback((optionValue: string) => value.includes(optionValue), [value])

  // Selected count for badge
  const selectedCount = value.length

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="filter-trigger" aria-label={`Filter by ${filter.label}`}>
        {filter.icon && <i className={filter.icon} aria-hidden="true" />}
        <span>{filter.label}</span>
        {selectedCount > 0 && <span className="filter-trigger-badge">{selectedCount}</span>}
        <i className={`bx ${open ? "bx-chevron-up" : "bx-chevron-down"}`} aria-hidden="true" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="filter-dropdown" sideOffset={8} align="start">
          {/* Search input */}
          <div className="filter-dropdown-search">
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              aria-label={`Search ${filter.label}`}
            />
          </div>

          {/* Options list */}
          <div className="filter-dropdown-options">
            {filteredOptions.length === 0 ? (
              <div className="filter-dropdown-empty">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const selected = isSelected(option.value)
                return (
                  <label
                    key={option.value}
                    className="filter-option"
                    role="option"
                    aria-selected={selected}
                  >
                    <Checkbox.Root
                      className="filter-checkbox"
                      checked={selected}
                      onCheckedChange={(checked) => handleCheckedChange(option.value, !!checked)}
                    >
                      <Checkbox.Indicator className="filter-checkbox-indicator">
                        <i className="bx bx-check" aria-hidden="true" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    {option.icon && <span className="filter-option-icon">{option.icon}</span>}
                    <span className="filter-option-label">{option.label}</span>
                    {option.count !== undefined && (
                      <span className="filter-option-count">{option.count}</span>
                    )}
                  </label>
                )
              })
            )}
          </div>

          {/* Clear selection button */}
          {selectedCount > 0 && (
            <div className="filter-dropdown-footer">
              <button type="button" className="filter-dropdown-clear" onClick={() => onChange([])}>
                Clear selection
              </button>
            </div>
          )}

          <Popover.Arrow className="filter-dropdown-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
