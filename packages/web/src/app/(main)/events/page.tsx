import EventsPageContent from "@/components/events/events-page-content"
import { getEventFilterOptions } from "@/components/events/get-filter-options.action"
import { getAllEvents } from "@/components/events/get.action"
import type { Event } from "@/models/strapi"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Events",
}

// Force static generation - filtering happens client-side
export const dynamic = "force-static"
export const revalidate = 3600

/**
 * Events page with pure client-side filtering
 *
 * - Page is statically generated with ALL events at build time
 * - Filter options are pre-fetched at build time
 * - Filtering happens entirely client-side (instant, no loading)
 * - URL params are used for shareable filter states
 */
export default async function Events() {
  // Fetch ALL events and filter options in parallel at build time
  const [filterOptions, events] = await Promise.all([
    getEventFilterOptions(),
    getAllEvents(), // Fetches all pages (Strapi limits to 100 per page)
  ])

  return <EventsPageContent initialEvents={events as Event[]} filterOptions={filterOptions} />
}
