"use client"

import * as ToggleGroup from "@radix-ui/react-toggle-group"
import type { FilterToggleProps } from "./types"

/**
 * Filter component using Radix ToggleGroup for pill-style buttons
 *
 * Best for filter categories with few options (< 6) like Status, Position.
 * Supports single or multi-select based on filter configuration.
 *
 * @example
 * ```tsx
 * <FilterToggle
 *   filter={{
 *     id: 'status',
 *     label: 'Status',
 *     options: [
 *       { value: 'Open', label: 'Open', count: 12 },
 *       { value: 'Over', label: 'Over', count: 45 },
 *     ],
 *   }}
 *   value={['Open']}
 *   onChange={(values) => setFilter('status', values)}
 * />
 * ```
 */
export default function FilterToggle({ filter, value, onChange }: FilterToggleProps) {
  const multiSelect = filter.multiSelect !== false

  if (multiSelect) {
    return (
      <ToggleGroup.Root
        type="multiple"
        value={value}
        onValueChange={onChange}
        className="filter-toggle-group"
        aria-label={`Filter by ${filter.label}`}
      >
        {filter.icon && (
          <span className="filter-group-icon">
            <i className={filter.icon} aria-hidden="true" />
          </span>
        )}
        {filter.options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className="filter-pill"
            aria-label={option.label}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className="filter-pill-badge">{option.count}</span>
            )}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    )
  }

  // Single select mode
  return (
    <ToggleGroup.Root
      type="single"
      value={value[0] || ""}
      onValueChange={(newValue) => onChange(newValue ? [newValue] : [])}
      className="filter-toggle-group"
      aria-label={`Filter by ${filter.label}`}
    >
      {filter.icon && (
        <span className="filter-group-icon">
          <i className={filter.icon} aria-hidden="true" />
        </span>
      )}
      {filter.options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="filter-pill"
          aria-label={option.label}
        >
          {option.icon}
          <span>{option.label}</span>
          {option.count !== undefined && <span className="filter-pill-badge">{option.count}</span>}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
