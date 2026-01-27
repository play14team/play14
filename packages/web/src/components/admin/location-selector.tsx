"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import ReactCountryFlag from "react-country-flag"
import { getCountryName } from "@/app/(admin)/admin/events/[slug]/hooks/use-event-form"

export interface LocationOption {
  documentId: string
  name: string
  country: string
}

interface LocationSelectorProps {
  locations: LocationOption[]
  value: string
  onChange: (value: string) => void
  onCreateNew: () => void
  placeholder?: string
}

export default function LocationSelector({
  locations,
  value,
  onChange,
  onCreateNew,
  placeholder = "Select a location...",
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Find the selected location
  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.documentId === value),
    [locations, value]
  )

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!search) return locations
    const searchLower = search.toLowerCase()
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchLower) ||
        loc.country.toLowerCase().includes(searchLower) ||
        getCountryName(loc.country).toLowerCase().includes(searchLower)
    )
  }, [locations, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (locationId: string) => {
    onChange(locationId)
    setIsOpen(false)
    setSearch("")
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    setSearch("")
    onCreateNew()
  }

  return (
    <div className="location-selector" ref={containerRef}>
      <button
        type="button"
        className={`location-selector-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="location-selector-value">
          {selectedLocation ? (
            <>
              <span className="location-selector-flag">
                <ReactCountryFlag
                  countryCode={selectedLocation.country}
                  svg
                  style={{ width: "20px", height: "15px" }}
                  title={getCountryName(selectedLocation.country)}
                />
              </span>
              <span className="location-selector-text">{selectedLocation.name}</span>
            </>
          ) : (
            <span className="location-selector-text location-selector-placeholder">
              {placeholder}
            </span>
          )}
        </div>
        <span className="location-selector-arrow">
          <i className="bx bx-chevron-down" />
        </span>
      </button>

      {isOpen && (
        <div className="location-selector-dropdown" role="listbox">
          <div className="location-selector-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="location-selector-list">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => (
                <button
                  key={loc.documentId}
                  type="button"
                  className={`location-selector-option ${loc.documentId === value ? "is-selected" : ""}`}
                  onClick={() => handleSelect(loc.documentId)}
                  role="option"
                  aria-selected={loc.documentId === value}
                >
                  <span className="location-selector-flag">
                    <ReactCountryFlag
                      countryCode={loc.country}
                      svg
                      style={{ width: "20px", height: "15px" }}
                      title={getCountryName(loc.country)}
                    />
                  </span>
                  <span className="location-selector-option-name">{loc.name}</span>
                  <span className="location-selector-option-country">
                    {getCountryName(loc.country)}
                  </span>
                </button>
              ))
            ) : (
              <div className="location-selector-empty">No locations found</div>
            )}
          </div>

          <button type="button" className="location-selector-create" onClick={handleCreateNew}>
            <i className="bx bx-plus" />
            Create new location
          </button>
        </div>
      )}
    </div>
  )
}
