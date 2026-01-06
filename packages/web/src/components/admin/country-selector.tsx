"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import ReactCountryFlag from "react-country-flag"
import countries from "i18n-iso-countries"
import en from "i18n-iso-countries/langs/en.json"

// Register English locale for country names
countries.registerLocale(en)

function getAllCountries(): { code: string; name: string }[] {
  const countryNames = countries.getNames("en")
  return Object.entries(countryNames)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function getCountryName(code: string): string {
  return countries.getName(code, "en") || code
}

interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export default function CountrySelector({
  value,
  onChange,
  placeholder = "Select a country...",
  required = false,
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const allCountries = useMemo(() => getAllCountries(), [])

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!search) return allCountries
    const searchLower = search.toLowerCase()
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.code.toLowerCase().includes(searchLower)
    )
  }, [allCountries, search])

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

  const handleSelect = (countryCode: string) => {
    onChange(countryCode)
    setIsOpen(false)
    setSearch("")
  }

  return (
    <div className="country-selector" ref={containerRef}>
      <button
        type="button"
        className={`country-selector-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
      >
        <div className="country-selector-value">
          {value ? (
            <>
              <span className="country-selector-flag">
                <ReactCountryFlag
                  countryCode={value}
                  svg
                  style={{ width: "20px", height: "15px" }}
                  title={getCountryName(value)}
                />
              </span>
              <span className="country-selector-text">
                {getCountryName(value)}
              </span>
            </>
          ) : (
            <span className="country-selector-text country-selector-placeholder">
              {placeholder}
            </span>
          )}
        </div>
        <span className="country-selector-arrow">
          <i className="bx bx-chevron-down"></i>
        </span>
      </button>

      {isOpen && (
        <div className="country-selector-dropdown" role="listbox">
          <div className="country-selector-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="country-selector-list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={`country-selector-option ${country.code === value ? "is-selected" : ""}`}
                  onClick={() => handleSelect(country.code)}
                  role="option"
                  aria-selected={country.code === value}
                >
                  <span className="country-selector-flag">
                    <ReactCountryFlag
                      countryCode={country.code}
                      svg
                      style={{ width: "20px", height: "15px" }}
                      title={country.name}
                    />
                  </span>
                  <span className="country-selector-option-name">{country.name}</span>
                </button>
              ))
            ) : (
              <div className="country-selector-empty">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
