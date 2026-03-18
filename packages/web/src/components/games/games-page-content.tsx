"use client"

import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { FilterBar, type FilterConfig, type FilterOption, useFilters } from "@/components/filters"
import { useIntersection } from "@/hooks/useIntersection"
import type { Game } from "@/models/strapi"
import Loader from "../layout/loader"
import GameGrid from "./grid"

interface GamesPageContentProps {
  initialGames: Game[]
  filterOptions: {
    categories: FilterOption[]
    tags: FilterOption[]
  }
}

const PAGE_SIZE = 18

/**
 * Client-side games page content with pure client-side filtering
 *
 * - All games are loaded at build time
 * - Filtering happens entirely in the browser (instant, no loading)
 * - URL params are synced for shareable links
 */
export default function GamesPageContent({ initialGames, filterOptions }: GamesPageContentProps) {
  const t = useTranslations("games")
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
  const filteredGames = useMemo(() => {
    return initialGames.filter((game) => {
      // Category filter (case-insensitive)
      if (activeFilters.category?.length) {
        const gameCategory = game.category?.toLowerCase()
        if (!gameCategory || !activeFilters.category.includes(gameCategory)) {
          return false
        }
      }

      // Tag filter (check if game has any of the selected tags)
      if (activeFilters.tag?.length) {
        const gameTags = game.tags?.map((t) => t.value?.toLowerCase()) || []
        const hasMatchingTag = activeFilters.tag.some((filterTag) =>
          gameTags.includes(filterTag.toLowerCase())
        )
        if (!hasMatchingTag) {
          return false
        }
      }

      return true
    })
  }, [initialGames, activeFilters])

  // Client-side pagination
  const visibleGames = filteredGames.slice(0, visibleCount)
  const hasMore = visibleCount < filteredGames.length

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
      label: t("filters.category"),
      icon: "bx bx-collection",
      options: filterOptions.categories,
      displayMode: "pills",
      multiSelect: true,
    },
    {
      id: "tag",
      label: t("filters.tags"),
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
        <h1>{t("title")}</h1>
        <FilterBar
          filters={activeFilterConfigs}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
          totalCount={filteredGames.length}
          countLabel={t("filters.countLabel")}
        />
      </div>

      <GameGrid games={visibleGames} />

      {hasMore && (
        <div ref={loadMoreRef} aria-live="polite">
          <Loader />
        </div>
      )}
    </>
  )
}
