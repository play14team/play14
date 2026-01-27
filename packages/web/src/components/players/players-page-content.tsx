"use client"

import { useEffect, useMemo, useState } from "react"
import { FilterBar, type FilterConfig, type FilterOption, useFilters } from "@/components/filters"
import { useIntersection } from "@/hooks/useIntersection"
import type { Player } from "@/models/strapi"
import Loader from "../layout/loader"
import PlayerGrid from "./grid"

interface PlayersPageContentProps {
  initialPlayers: Player[]
  filterOptions: {
    positions: FilterOption[]
    letters: FilterOption[]
  }
}

const PAGE_SIZE = 24

/**
 * Client-side players page content with pure client-side filtering
 *
 * - All players are loaded at build time
 * - Filtering happens entirely in the browser (instant, no loading)
 * - URL params are synced for shareable links
 */
export default function PlayersPageContent({
  initialPlayers,
  filterOptions,
}: PlayersPageContentProps) {
  const { activeFilters, setFilter, clearAllFilters } = useFilters(["letter", "position"])

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
  const filteredPlayers = useMemo(() => {
    return initialPlayers.filter((player) => {
      // Letter filter (first letter of name, case-insensitive)
      if (activeFilters.letter?.length) {
        const firstLetter = player.name?.charAt(0)?.toLowerCase()
        if (!firstLetter || !activeFilters.letter.includes(firstLetter)) {
          return false
        }
      }

      // Position filter (case-insensitive)
      if (activeFilters.position?.length) {
        const playerPosition = player.position?.toLowerCase()
        if (!playerPosition || !activeFilters.position.includes(playerPosition)) {
          return false
        }
      }

      return true
    })
  }, [initialPlayers, activeFilters])

  // Client-side pagination
  const visiblePlayers = filteredPlayers.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPlayers.length

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
      id: "letter",
      label: "Name",
      icon: "bx bx-sort-a-z",
      options: filterOptions.letters.map((opt) => ({
        ...opt,
        value: opt.value.toLowerCase(), // Ensure lowercase for filter comparison
      })),
      displayMode: "dropdown",
      multiSelect: false,
    },
    {
      id: "position",
      label: "Position",
      icon: "bx bx-user",
      options: filterOptions.positions,
      displayMode: "pills",
      multiSelect: true,
    },
  ]

  // Filter out empty filter groups
  const activeFilterConfigs = filters.filter((f) => f.options.length > 0)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <h1>Players</h1>
        <FilterBar
          filters={activeFilterConfigs}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
          totalCount={filteredPlayers.length}
          countLabel="players"
        />
      </div>

      <PlayerGrid players={visiblePlayers} />

      {hasMore && (
        <div ref={loadMoreRef} aria-live="polite">
          <Loader />
        </div>
      )}
    </>
  )
}
