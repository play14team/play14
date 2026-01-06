"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Image from "next/image"

export interface VenueOption {
  documentId: string
  name: string
  addressDetails?: string
  logo?: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  } | null
}

interface VenueSelectorProps {
  venues: VenueOption[]
  value: string
  onChange: (value: string) => void
  onCreateNew: () => void
  placeholder?: string
}

export default function VenueSelector({
  venues,
  value,
  onChange,
  onCreateNew,
  placeholder = "Select a venue...",
}: VenueSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Find the selected venue
  const selectedVenue = useMemo(
    () => venues.find((v) => v.documentId === value),
    [venues, value]
  )

  // Filter venues based on search
  const filteredVenues = useMemo(() => {
    if (!search) return venues
    const searchLower = search.toLowerCase()
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(searchLower) ||
        v.addressDetails?.toLowerCase().includes(searchLower)
    )
  }, [venues, search])

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

  const handleSelect = (venueId: string) => {
    onChange(venueId)
    setIsOpen(false)
    setSearch("")
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    setSearch("")
    onCreateNew()
  }

  const getLogoUrl = (venue: VenueOption): string | null => {
    if (!venue.logo) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const url = venue.logo.formats?.thumbnail?.url || venue.logo.formats?.small?.url || venue.logo.url
    return url.startsWith("http") ? url : `${baseUrl}${url}`
  }

  return (
    <div className="venue-selector" ref={containerRef}>
      <button
        type="button"
        className={`venue-selector-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="venue-selector-value">
          {selectedVenue ? (
            <>
              <span className="venue-selector-logo">
                {getLogoUrl(selectedVenue) ? (
                  <Image
                    src={getLogoUrl(selectedVenue)!}
                    alt={selectedVenue.name}
                    width={24}
                    height={24}
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <i className="bx bx-building-house"></i>
                )}
              </span>
              <span className="venue-selector-text">
                {selectedVenue.name}
              </span>
            </>
          ) : (
            <span className="venue-selector-text venue-selector-placeholder">
              {placeholder}
            </span>
          )}
        </div>
        <span className="venue-selector-arrow">
          <i className="bx bx-chevron-down"></i>
        </span>
      </button>

      {isOpen && (
        <div className="venue-selector-dropdown" role="listbox">
          <div className="venue-selector-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="venue-selector-list">
            {filteredVenues.length > 0 ? (
              filteredVenues.map((v) => {
                const logoUrl = getLogoUrl(v)
                return (
                  <button
                    key={v.documentId}
                    type="button"
                    className={`venue-selector-option ${v.documentId === value ? "is-selected" : ""}`}
                    onClick={() => handleSelect(v.documentId)}
                    role="option"
                    aria-selected={v.documentId === value}
                  >
                    <span className="venue-selector-logo">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={v.name}
                          width={24}
                          height={24}
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <i className="bx bx-building-house"></i>
                      )}
                    </span>
                    <span className="venue-selector-option-name">{v.name}</span>
                    {v.addressDetails && (
                      <span className="venue-selector-option-address">
                        {v.addressDetails}
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="venue-selector-empty">
                No venues found
              </div>
            )}
          </div>

          <button
            type="button"
            className="venue-selector-create"
            onClick={handleCreateNew}
          >
            <i className="bx bx-plus"></i>
            Create new venue
          </button>
        </div>
      )}
    </div>
  )
}
