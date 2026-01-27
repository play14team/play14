"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { getSponsors, type SponsorListItem, type SponsorsListResponse } from "./sponsors.action"

export default function SponsorsList() {
  const [sponsors, setSponsors] = useState<SponsorListItem[]>([])
  const [pagination, setPagination] = useState<SponsorsListResponse["meta"]["pagination"]>({
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

  const fetchSponsors = useCallback(async (page = 1, search?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getSponsors(page, 54, search || undefined)
      setSponsors(result.data)
      setPagination(result.meta.pagination)
    } catch {
      setError("Failed to fetch sponsors")
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
    fetchSponsors(1, debouncedSearch)
  }, [fetchSponsors, debouncedSearch])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
  }

  const handlePageChange = (newPage: number) => {
    fetchSponsors(newPage, debouncedSearch)
  }

  const getLogoUrl = (sponsor: SponsorListItem): string | null => {
    if (!sponsor.logo) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    // Prefer thumbnail or small format
    const url =
      sponsor.logo.formats?.thumbnail?.url || sponsor.logo.formats?.small?.url || sponsor.logo.url
    return url.startsWith("http") ? url : `${baseUrl}${url}`
  }

  if (isLoading && sponsors.length === 0) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin" />
        <span>Loading sponsors...</span>
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
          onClick={() => fetchSponsors(1, debouncedSearch)}
        >
          <i className="bx bx-refresh" />
          Try Again
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
              placeholder="Search sponsors..."
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
            Clear filters
          </button>
        )}

        <div className="venues-count">
          {pagination.total} sponsor{pagination.total !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin" />
          <span>Loading...</span>
        </div>
      ) : sponsors.length === 0 ? (
        <div className="claims-empty">
          <i className="bx bx-diamond" />
          <h3>No sponsors found</h3>
          <p>
            {searchQuery ? "Try adjusting your search" : "Create your first sponsor to get started"}
          </p>
          {searchQuery && (
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
          <div className="venues-grid">
            {sponsors.map((sponsor) => {
              const logoUrl = getLogoUrl(sponsor)
              return (
                <Link
                  key={sponsor.documentId}
                  href={`/admin/sponsors/${sponsor.documentId}`}
                  className="venue-card"
                >
                  <div className="venue-card-logo">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={sponsor.name}
                        width={48}
                        height={48}
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <i className="bx bx-diamond" />
                    )}
                  </div>
                  <div className="venue-card-info">
                    <h3 className="venue-card-name">{sponsor.name}</h3>
                    {sponsor.url && <span className="venue-card-address">{sponsor.url}</span>}
                    <span className="venue-card-events">
                      {sponsor.eventsCount} event{sponsor.eventsCount !== 1 ? "s" : ""}
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
                <i className="bx bx-chevron-right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
