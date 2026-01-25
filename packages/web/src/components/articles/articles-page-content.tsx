"use client"

import { FilterBar, type FilterConfig, type FilterOption, useFilters } from "@/components/filters"
import { useIntersection } from "@/hooks/useIntersection"
import type { Article } from "@/models/strapi"
import { useEffect, useMemo, useState } from "react"
import Loader from "../layout/loader"
import ArticleGrid from "./grid"

interface ArticlesPageContentProps {
  initialArticles: Article[]
  filterOptions: {
    categories: FilterOption[]
    tags: FilterOption[]
  }
}

const PAGE_SIZE = 18

/**
 * Client-side articles page content with pure client-side filtering
 *
 * - All articles are loaded at build time
 * - Filtering happens entirely in the browser (instant, no loading)
 * - URL params are synced for shareable links
 */
export default function ArticlesPageContent({
  initialArticles,
  filterOptions,
}: ArticlesPageContentProps) {
  const { activeFilters, setFilter, clearAllFilters } = useFilters(["category", "tag"])

  // Client-side pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Intersection observer for infinite scroll
  const [isVisible, loadMoreRef] = useIntersection("200px")

  // Create stable key from active filters
  const filterKey = JSON.stringify(activeFilters)

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filterKey])

  // Pure client-side filtering - instant, no server fetch
  const filteredArticles = useMemo(() => {
    return initialArticles.filter((article) => {
      // Category filter (case-insensitive)
      if (activeFilters.category?.length) {
        const articleCategory = article.category?.toLowerCase()
        if (!articleCategory || !activeFilters.category.includes(articleCategory)) {
          return false
        }
      }

      // Tag filter (check if article has any of the selected tags)
      if (activeFilters.tag?.length) {
        const articleTags = article.tags?.map((t) => t.value?.toLowerCase()) || []
        const hasMatchingTag = activeFilters.tag.some((filterTag) =>
          articleTags.includes(filterTag.toLowerCase())
        )
        if (!hasMatchingTag) {
          return false
        }
      }

      return true
    })
  }, [initialArticles, activeFilters])

  // Client-side pagination
  const visibleArticles = filteredArticles.slice(0, visibleCount)
  const hasMore = visibleCount < filteredArticles.length

  // Load more when intersection observer triggers
  useEffect(() => {
    if (isVisible && hasMore) {
      // Use setTimeout to allow React to re-render between batches
      const timer = setTimeout(() => {
        setVisibleCount((c) => c + PAGE_SIZE)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isVisible, hasMore, visibleCount])

  // Build filter configurations
  const filters: FilterConfig[] = [
    {
      id: "category",
      label: "Category",
      icon: "bx bx-collection",
      options: filterOptions.categories,
      displayMode: "pills",
      multiSelect: true,
    },
    {
      id: "tag",
      label: "Tags",
      icon: "bx bx-purchase-tag",
      options: filterOptions.tags,
      displayMode: "dropdown",
      multiSelect: true,
    },
  ]

  // Filter out empty filter groups
  const activeFilterConfigs = filters.filter((f) => f.options.length > 0)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <h1>Articles</h1>
        <FilterBar
          filters={activeFilterConfigs}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
          totalCount={filteredArticles.length}
          countLabel="articles"
        />
      </div>

      <ArticleGrid articles={visibleArticles} />

      {hasMore && (
        <div ref={loadMoreRef} className="centered py-4">
          <Loader />
        </div>
      )}
    </>
  )
}
