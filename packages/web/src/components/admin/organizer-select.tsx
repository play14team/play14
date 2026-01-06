"use client"

import { useState, useRef, useEffect } from "react"
import Avatar from "@/components/ui/avatar"
import type { OrganizerOption } from "@/app/(admin)/admin/events/[slug]/event-edit.action"

interface OrganizerSelectProps {
  organizers: OrganizerOption[]
  selectedIds: string[]
  onSelect: (id: string) => void
  placeholder?: string
  filterFn?: (organizer: OrganizerOption) => boolean
}

export default function OrganizerSelect({
  organizers,
  selectedIds,
  onSelect,
  placeholder = "Add...",
  filterFn,
}: OrganizerSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter organizers: exclude selected ones, apply custom filter, and search
  const availableOrganizers = organizers.filter((o) => {
    // Exclude already selected
    if (selectedIds.includes(o.documentId)) return false
    // Apply custom filter if provided
    if (filterFn && !filterFn(o)) return false
    // Apply search filter
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearch("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (id: string) => {
    onSelect(id)
    setIsOpen(false)
    setSearch("")
  }

  return (
    <div className="organizer-select" ref={containerRef}>
      <button
        type="button"
        className="organizer-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="organizer-select-placeholder">{placeholder}</span>
        <i className={`bx bx-chevron-${isOpen ? "up" : "down"}`}></i>
      </button>

      {isOpen && (
        <div className="organizer-select-dropdown">
          <div className="organizer-select-search">
            <i className="bx bx-search"></i>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ul className="organizer-select-list" role="listbox">
            {availableOrganizers.length === 0 ? (
              <li className="organizer-select-empty">
                {search ? "No matches found" : "No organizers available"}
              </li>
            ) : (
              availableOrganizers.map((organizer) => (
                <li
                  key={organizer.documentId}
                  role="option"
                  aria-selected={false}
                  className="organizer-select-option"
                  onClick={() => handleSelect(organizer.documentId)}
                >
                  <Avatar
                    src={organizer.avatar?.url}
                    alt={organizer.name}
                    fallback={organizer.name}
                    size="sm"
                  />
                  <div className="organizer-select-option-info">
                    <span className="organizer-select-option-name">
                      {organizer.name}
                    </span>
                    <span className="organizer-select-option-position">
                      {organizer.position}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

interface SelectedOrganizerProps {
  organizer: OrganizerOption | undefined
  onRemove: () => void
}

export function SelectedOrganizer({
  organizer,
  onRemove,
}: SelectedOrganizerProps) {
  if (!organizer) return null

  return (
    <li className="organizer-item organizer-item-with-avatar">
      <div className="organizer-item-content">
        <Avatar
          src={organizer.avatar?.url}
          alt={organizer.name}
          fallback={organizer.name}
          size="sm"
        />
        <span>{organizer.name}</span>
      </div>
      <button
        type="button"
        className="organizer-remove"
        onClick={onRemove}
        title="Remove"
      >
        <i className="bx bx-x"></i>
      </button>
    </li>
  )
}
