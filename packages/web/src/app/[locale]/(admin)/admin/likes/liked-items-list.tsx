"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  getLikedItems,
  type LikedItemListItem,
  type LikedItemsListResponse,
} from "./liked-items.action"

export default function LikedItemsList() {
  const t = useTranslations("adminCrud")
  const [items, setItems] = useState<LikedItemListItem[]>([])
  const [pagination, setPagination] = useState<LikedItemsListResponse["meta"]["pagination"]>({
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

  const fetchItems = useCallback(async (page = 1, search?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getLikedItems(page, 54, search || undefined)
      setItems(result.data)
      setPagination(result.meta.pagination)
    } catch {
      setError(t("common.failedToFetch", { entity: t("likes.entityName") }))
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
    fetchItems(1, debouncedSearch)
  }, [fetchItems, debouncedSearch])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleClearFilters = () => {
    setSearchQuery("")
  }

  const handlePageChange = (newPage: number) => {
    fetchItems(newPage, debouncedSearch)
  }

  const getImageUrl = (item: LikedItemListItem): string | null => {
    if (!item.image) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const url =
      item.image.formats?.thumbnail?.url || item.image.formats?.small?.url || item.image.url
    return url.startsWith("http") ? url : `${baseUrl}${url}`
  }

  const getAvatarUrl = (contributor: LikedItemListItem["contributors"][0]): string | null => {
    if (!contributor.avatar) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const url =
      contributor.avatar.formats?.thumbnail?.url ||
      contributor.avatar.formats?.small?.url ||
      contributor.avatar.url
    return url.startsWith("http") ? url : `${baseUrl}${url}`
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("likes.list.loadingItems")}</span>
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
          onClick={() => fetchItems(1, debouncedSearch)}
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
              placeholder={t("common.searchPlaceholder", { entity: t("likes.entityName") })}
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
                entity: t("likes.entityName"),
                query: searchQuery,
              })
            : t("common.totalCount", { count: pagination.total, entity: t("likes.entityName") })}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="claims-empty">
          <i className="bx bx-heart" />
          <h3>{t("likes.list.noItemsTitle")}</h3>
          <p>{searchQuery ? t("likes.list.noItemsHint") : t("likes.list.noItemsEmpty")}</p>
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
            {items.map((item) => {
              const imageUrl = getImageUrl(item)
              return (
                <Link
                  key={item.documentId}
                  href={`/admin/likes/${item.documentId}`}
                  className="venue-card"
                >
                  <div className="venue-card-logo">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.name}
                        width={48}
                        height={48}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <i className="bx bx-heart" />
                    )}
                  </div>
                  <div className="venue-card-info">
                    <h3 className="venue-card-name">{item.name}</h3>
                    {item.description && (
                      <span className="venue-card-address">
                        {item.description.length > 60
                          ? `${item.description.substring(0, 60)}...`
                          : item.description}
                      </span>
                    )}
                    {item.contributors.length > 0 && (
                      <div className="liked-item-contributors">
                        {item.contributors.slice(0, 3).map((c) => {
                          const avatarUrl = getAvatarUrl(c)
                          return (
                            <span key={c.documentId} className="contributor-avatar" title={c.name}>
                              {avatarUrl ? (
                                <Image
                                  src={avatarUrl}
                                  alt={c.name}
                                  width={20}
                                  height={20}
                                  style={{ borderRadius: "50%" }}
                                />
                              ) : (
                                <i className="bx bx-user" />
                              )}
                            </span>
                          )
                        })}
                        {item.contributors.length > 3 && (
                          <span className="contributor-more">+{item.contributors.length - 3}</span>
                        )}
                      </div>
                    )}
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

      <style jsx>{`
        .liked-item-contributors {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
        .contributor-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-bg-tertiary);
          overflow: hidden;
        }
        .contributor-avatar i {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .contributor-more {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-left: 2px;
        }
      `}</style>
    </div>
  )
}
