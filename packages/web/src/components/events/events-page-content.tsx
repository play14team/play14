"use client"

import { FilterBar, type FilterConfig, type FilterOption, useFilters } from "@/components/filters"
import { useIntersection } from "@/hooks/useIntersection"
import type { Event } from "@/models/strapi"
import { useEffect, useMemo, useState } from "react"
import ReactCountryFlag from "react-country-flag"
import Loader from "../layout/loader"
import EventGrid from "./grid"

interface EventsPageContentProps {
  initialEvents: Event[]
  filterOptions: {
    countries: FilterOption[]
    statuses: FilterOption[]
    locations: FilterOption[]
    years: FilterOption[]
  }
}

const PAGE_SIZE = 18
const FILTER_IDS = ["year", "status", "country", "location"] as const

/**
 * Client-side events page content with pure client-side filtering
 *
 * - All events are loaded at build time
 * - Filtering happens entirely in the browser (instant, no loading)
 * - URL params are synced for shareable links
 */
export default function EventsPageContent({
  initialEvents,
  filterOptions,
}: EventsPageContentProps) {
  const { activeFilters, setFilter, clearAllFilters } = useFilters([...FILTER_IDS])

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
  const filteredEvents = useMemo(() => {
    return initialEvents.filter((event) => {
      // Year filter (extract year from start date)
      if (activeFilters.year?.length) {
        const eventYear = new Date(event.start).getFullYear().toString()
        if (!activeFilters.year.includes(eventYear)) {
          return false
        }
      }

      // Status filter
      if (activeFilters.status?.length) {
        if (!activeFilters.status.includes(event.eventStatus)) {
          return false
        }
      }

      // Country filter (lowercase comparison)
      if (activeFilters.country?.length) {
        const eventCountry = event.location?.country?.toLowerCase()
        if (!eventCountry || !activeFilters.country.includes(eventCountry)) {
          return false
        }
      }

      // Location filter (lowercase comparison)
      if (activeFilters.location?.length) {
        const eventLocation = event.location?.name?.toLowerCase()
        if (!eventLocation || !activeFilters.location.includes(eventLocation)) {
          return false
        }
      }

      return true
    })
  }, [initialEvents, activeFilters])

  // Client-side pagination
  const visibleEvents = filteredEvents.slice(0, visibleCount)
  const hasMore = visibleCount < filteredEvents.length

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
      id: "year",
      label: "Year",
      icon: "bx bx-calendar",
      options: filterOptions.years,
      displayMode: "dropdown",
      multiSelect: false,
    },
    {
      id: "status",
      label: "Status",
      icon: "bx bx-info-circle",
      options: filterOptions.statuses,
      displayMode: "pills",
      multiSelect: true,
    },
    {
      id: "country",
      label: "Country",
      icon: "bx bx-globe",
      options: filterOptions.countries.map((opt) => ({
        ...opt,
        icon: (
          <ReactCountryFlag
            countryCode={opt.value.toUpperCase()}
            svg
            style={{ width: "1.2em", height: "1.2em" }}
          />
        ),
      })),
      displayMode: "dropdown",
      multiSelect: true,
    },
    {
      id: "location",
      label: "Location",
      icon: "bx bx-map-pin",
      options: filterOptions.locations,
      displayMode: "dropdown",
      multiSelect: true,
    },
  ]

  // Filter out empty filter groups
  const activeFilterConfigs = filters.filter((f) => f.options.length > 0)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <h1>Events</h1>
        <FilterBar
          filters={activeFilterConfigs}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
          totalCount={filteredEvents.length}
          countLabel="events"
        />
      </div>

      <EventGrid events={visibleEvents} />

      {hasMore && (
        <div ref={loadMoreRef} aria-live="polite">
          <Loader />
        </div>
      )}
    </>
  )
}
