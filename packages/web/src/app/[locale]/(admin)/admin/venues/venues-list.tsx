"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { getVenues, type VenueListItem, type VenuesListResponse } from "./venues.action"

export default function VenuesList() {
  const t = useTranslations("adminCrud")
  const [venues, setVenues] = useState<VenueListItem[]>([])
  const [pagination, setPagination] = useState<VenuesListResponse["meta"]["pagination"]>({
    page: 1,
    pageSize: 54,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchVenues = useCallback(async (page = 1, search?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getVenues(page, 54, search || undefined)
      setVenues(result.data)
      setPagination(result.meta.pagination)
    } catch {
      setError(t("common.failedToFetch", { entity: t("venues.entityName") }))
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
    fetchVenues(1, debouncedSearch)
  }, [fetchVenues, debouncedSearch])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
  }

  const handlePageChange = (newPage: number) => {
    fetchVenues(newPage, debouncedSearch)
  }

  const getLogoUrl = (venue: VenueListItem): string | null => {
    if (!venue.logo) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    // Prefer thumbnail or small format
    const url =
      venue.logo.formats?.thumbnail?.url || venue.logo.formats?.small?.url || venue.logo.url
    return url.startsWith("http") ? url : `${baseUrl}${url}`
  }

  if (isLoading && venues.length === 0) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("venues.list.loadingVenues")}</span>
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
          onClick={() => fetchVenues(1, debouncedSearch)}
        >
          <i className="bx bx-refresh" />
          {t("common.tryAgain")}
        </button>
      </div>
    )
  }

  return (
    <div className="venues-list">
      <div className="venues-toolbar">
        <div className="venues-search">
          <div className="search-input-wrapper">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder={t("common.searchPlaceholder", { entity: t("venues.entityName") })}
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

        {searchQuery && (
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={handleClearFilters}
          >
            <i className="bx bx-x" />
            {t("common.clearFilters")}
          </button>
        )}

        <div className="venues-count">
          {searchQuery
            ? t("common.totalCountMatching", {
                count: pagination.total,
                entity: t("venues.entityName"),
                query: searchQuery,
              })
            : t("common.totalCount", { count: pagination.total, entity: t("venues.entityName") })}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : venues.length === 0 ? (
        <div className="claims-empty">
          <i className="bx bx-building-house" />
          <h3>{t("venues.list.noVenuesTitle")}</h3>
          <p>{searchQuery ? t("venues.list.noVenuesHint") : t("venues.list.noVenuesEmpty")}</p>
          {searchQuery && (
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
          <div className="venues-grid">
            {venues.map((venue) => {
              const logoUrl = getLogoUrl(venue)
              return (
                <Link
                  key={venue.documentId}
                  href={`/admin/venues/${venue.documentId}`}
                  className="venue-card"
                >
                  <div className="venue-card-logo">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={venue.name}
                        width={48}
                        height={48}
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <i className="bx bx-building-house" />
                    )}
                  </div>
                  <div className="venue-card-info">
                    <h3 className="venue-card-name">{venue.name}</h3>
                    {venue.addressDetails && (
                      <span className="venue-card-address">{venue.addressDetails}</span>
                    )}
                    <span className="venue-card-events">
                      {t("venues.list.eventsCount", { count: venue.eventsCount })}
                    </span>
                  </div>
                  <div className="venue-card-action">
                    <i className="bx bx-chevron-right" />
                  </div>
                </Link>
              )
            })}
          </div>

          {pagination.pageCount > 1 && (
            <div className="venues-pagination">
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
