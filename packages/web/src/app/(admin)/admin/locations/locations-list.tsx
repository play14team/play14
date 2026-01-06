"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import countries from "i18n-iso-countries"
import en from "i18n-iso-countries/langs/en.json"
import ReactCountryFlag from "react-country-flag"
import { getLocations, type LocationListItem, type LocationsListResponse } from "./locations.action"

// Register English locale for country names
countries.registerLocale(en)

export default function LocationsList() {
  const [locations, setLocations] = useState<LocationListItem[]>([])
  const [pagination, setPagination] = useState<LocationsListResponse["meta"]["pagination"]>({
    page: 1,
    pageSize: 25,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get unique countries from all locations for the filter dropdown
  const [allCountries, setAllCountries] = useState<string[]>([])

  const fetchLocations = useCallback(async (page = 1, search?: string, country?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getLocations(page, 25, search || undefined, country || undefined)
      setLocations(result.data)
      setPagination(result.meta.pagination)

      // Extract unique countries from results (on first load only)
      if (page === 1 && !search && !country) {
        const uniqueCountries = [...new Set(result.data.map(l => l.country))].sort()
        setAllCountries(uniqueCountries)
      }
    } catch {
      setError("Failed to fetch locations")
    }

    setIsLoading(false)
  }, [])

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    fetchLocations(1, debouncedSearch, selectedCountry)
  }, [fetchLocations, debouncedSearch, selectedCountry])

  // Fetch all countries on mount for the dropdown
  useEffect(() => {
    const fetchAllCountries = async () => {
      const result = await getLocations(1, 1000) // Get all to extract countries
      const uniqueCountries = [...new Set(result.data.map(l => l.country))].sort()
      setAllCountries(uniqueCountries)
    }
    fetchAllCountries()
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedCountry("")
  }

  const handlePageChange = (newPage: number) => {
    fetchLocations(newPage, debouncedSearch, selectedCountry)
  }

  const getCountryName = (code: string): string => {
    return countries.getName(code, "en") || code
  }

  if (isLoading && locations.length === 0) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin"></i>
        <span>Loading locations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle"></i>
        <p>{error}</p>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => fetchLocations(1, debouncedSearch, selectedCountry)}
        >
          <i className="bx bx-refresh"></i>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="locations-list">
      <div className="locations-toolbar">
        <div className="locations-search">
          <div className="search-input-wrapper">
            <i className="bx bx-search"></i>
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
              >
                <i className="bx bx-x"></i>
              </button>
            )}
          </div>
        </div>

        <div className="locations-country-filter">
          <select
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="admin-select"
          >
            <option value="">All countries</option>
            {allCountries.map((code) => (
              <option key={code} value={code}>
                {getCountryName(code)}
              </option>
            ))}
          </select>
        </div>

        {(searchQuery || selectedCountry) && (
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={handleClearFilters}
          >
            <i className="bx bx-x"></i>
            Clear filters
          </button>
        )}

        <div className="locations-count">
          {pagination.total} location{pagination.total !== 1 ? "s" : ""}
          {selectedCountry && ` in ${getCountryName(selectedCountry)}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin"></i>
          <span>Loading...</span>
        </div>
      ) : locations.length === 0 ? (
        <div className="claims-empty">
          <i className="bx bx-map"></i>
          <h3>No locations found</h3>
          <p>
            {searchQuery || selectedCountry
              ? "Try adjusting your search or filters"
              : "Create your first event location to get started"}
          </p>
          {(searchQuery || selectedCountry) && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="locations-grid">
            {locations.map((location) => (
              <Link
                key={location.documentId}
                href={`/admin/locations/${location.documentId}`}
                className="location-card"
              >
                <div className="location-card-flag">
                  <ReactCountryFlag
                    countryCode={location.country}
                    svg
                    style={{ width: "32px", height: "24px" }}
                    title={getCountryName(location.country)}
                  />
                </div>
                <div className="location-card-info">
                  <h3 className="location-card-name">{location.name}</h3>
                  <span className="location-card-country">
                    {getCountryName(location.country)}
                  </span>
                  <span className="location-card-events">
                    {location.eventsCount} event{location.eventsCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="location-card-action">
                  <i className="bx bx-chevron-right"></i>
                </div>
              </Link>
            ))}
          </div>

          {pagination.pageCount > 1 && (
            <div className="locations-pagination">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <i className="bx bx-chevron-left"></i>
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pageCount}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pagination.page >= pagination.pageCount}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
                <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
