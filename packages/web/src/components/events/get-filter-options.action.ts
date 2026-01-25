"use server"

import type { FilterOption } from "@/components/filters"
import { restQuery } from "@/libs/strapi-client"

interface EventFilterData {
  eventStatus?: string
  start?: string
  location?: {
    slug?: string
    name?: string
    country?: string
  }
}

/**
 * Event status options (hardcoded as these are fixed in the system)
 */
const EVENT_STATUSES = ["Announced", "Open", "Over", "Cancelled"]

/**
 * Convert ISO 3166-1 alpha-2 country code to full country name
 */
const countryNames = new Intl.DisplayNames(["en"], { type: "region" })
function getCountryName(code: string): string {
  try {
    return countryNames.of(code.toUpperCase()) || code
  } catch {
    return code
  }
}

/**
 * Get all filter options for the events page
 *
 * Returns countries, statuses, and locations with counts
 */
export async function getEventFilterOptions(): Promise<{
  countries: FilterOption[]
  statuses: FilterOption[]
  locations: FilterOption[]
  years: FilterOption[]
}> {
  // Fetch ALL events with minimal data for counting
  // Strapi limits to 100 per page, so we need to paginate
  const allEvents: EventFilterData[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<EventFilterData[]>("events", {
      fields: ["eventStatus", "start"],
      populate: { location: { fields: ["slug", "name", "country"] } },
      pagination: { page, pageSize },
    })

    const events = response.data || []
    allEvents.push(...events)

    if (events.length < pageSize) {
      break
    }
    page++
  }

  const events = allEvents

  // Count by country
  const countryCounts = new Map<string, number>()
  // Count by status
  const statusCounts = new Map<string, number>()
  // Count by location
  const locationCounts = new Map<string, { name: string; count: number }>()
  // Count by year
  const yearCounts = new Map<number, number>()

  for (const event of events) {
    // Country
    if (event.location?.country) {
      const country = event.location.country.toUpperCase()
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
    }

    // Status
    if (event.eventStatus) {
      statusCounts.set(event.eventStatus, (statusCounts.get(event.eventStatus) || 0) + 1)
    }

    // Location
    if (event.location?.slug && event.location?.name) {
      const existing = locationCounts.get(event.location.slug)
      if (existing) {
        existing.count++
      } else {
        locationCounts.set(event.location.slug, { name: event.location.name, count: 1 })
      }
    }

    // Year
    if (event.start) {
      const year = new Date(event.start).getFullYear()
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    }
  }

  // Build country options (sorted alphabetically by name)
  const countries: FilterOption[] = Array.from(countryCounts.entries())
    .map(([code, count]) => ({
      value: code.toLowerCase(),
      label: getCountryName(code),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Build status options (in predefined order)
  const statuses: FilterOption[] = EVENT_STATUSES.map((status) => ({
    value: status,
    label: status,
    count: statusCounts.get(status) || 0,
  })).filter((s) => s.count > 0)

  // Build location options (sorted alphabetically by name)
  const locations: FilterOption[] = Array.from(locationCounts.entries())
    .map(([slug, { name, count }]) => ({
      value: slug,
      label: name,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Build year options (sorted descending)
  const years: FilterOption[] = Array.from(yearCounts.entries())
    .map(([year, count]) => ({
      value: year.toString(),
      label: year.toString(),
      count,
    }))
    .sort((a, b) => Number(b.value) - Number(a.value))

  return { countries, statuses, locations, years }
}
