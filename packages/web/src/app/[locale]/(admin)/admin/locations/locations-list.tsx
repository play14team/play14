"use client"

import countries from "i18n-iso-countries"
import en from "i18n-iso-countries/langs/en.json"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import ReactCountryFlag from "react-country-flag"
import { getLocations, type LocationListItem, type LocationsListResponse } from "./locations.action"

// Register English locale for country names
countries.registerLocale(en)

export default function LocationsList() {
  const t = useTranslations("adminCrud")
  const [locations, setLocations] = useState<LocationListItem[]>([])
  const [pagination, setPagination] = useState<LocationsListResponse["meta"]["pagination"]>({
    page: 1,
    pageSize: 54,
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
      const result = await getLocations(page, 54, search || undefined, country || undefined)
      setLocations(result.data)
      setPagination(result.meta.pagination)

      // Extract unique countries from results (on first load only)
      if (page === 1 && !search && !country) {
        const uniqueCountries = [...new Set(result.data.map((l) => l.country))].sort()
        setAllCountries(uniqueCountries)
      }
    } catch {
      setError(t("common.failedToFetch", { entity: t("locations.entityName") }))
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
      const uniqueCountries = [...new Set(result.data.map((l) => l.country))].sort()
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
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("locations.list.loadingLocations")}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle" />
        <p>{error}</p>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => fetchLocations(1, debouncedSearch, selectedCountry)}
        >
          <i className="bx bx-refresh" />
          {t("common.tryAgain")}
        </button>
      </div>
    )
  }

  return (
    <div className="locations-list">
      <div className="locations-toolbar">
        <div className="locations-search">
          <div className="search-input-wrapper">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder={t("common.searchPlaceholder", { entity: t("locations.entityName") })}
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
                <i className="bx bx-x" />
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
            <option value="">{t("locations.list.allCountries")}</option>
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
            <i className="bx bx-x" />
            {t("common.clearFilters")}
          </button>
        )}

        <div className="locations-count">
          {searchQuery
            ? t("common.totalCountMatching", {
                count: pagination.total,
                entity: t("locations.entityName"),
                query: searchQuery,
              })
            : t("common.totalCount", {
                count: pagination.total,
                entity: t("locations.entityName"),
              })}
          {selectedCountry && !searchQuery && ` in ${getCountryName(selectedCountry)}`}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : locations.length === 0 ? (
        <div className="claims-empty">
          <i className="bx bx-map" />
          <h3>{t("locations.list.noLocationsTitle")}</h3>
          <p>
            {searchQuery || selectedCountry
              ? t("locations.list.noLocationsHint")
              : t("locations.list.noLocationsEmpty")}
          </p>
          {(searchQuery || selectedCountry) && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleClearFilters}
            >
              {t("common.clearFilters")}
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
                  <span className="location-card-country">{getCountryName(location.country)}</span>
                  <span className="location-card-events">
                    {t("locations.list.eventsCount", { count: location.eventsCount })}
                  </span>
                </div>
                <div className="location-card-action">
                  <i className="bx bx-chevron-right" />
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
                <i className="bx bx-chevron-left" />
                {t("common.previous")}
              </button>
              <span className="pagination-info">
                {t("common.pageOf", { page: pagination.page, pageCount: pagination.pageCount })}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pagination.page >= pagination.pageCount}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                {t("common.next")}
                <i className="bx bx-chevron-right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
