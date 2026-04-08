import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import EventsPageContent from "@/components/events/events-page-content"
import { getAllEvents } from "@/components/events/get.action"
import { getEventFilterOptions } from "@/components/events/get-filter-options.action"
import type { Event } from "@/models/strapi"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("events")
  return {
    title: t("title"),
  }
}

// Force static generation - filtering happens client-side
export const dynamic = "force-static"
export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Events page with pure client-side filtering
 *
 * - Page is statically generated with ALL events at build time
 * - Filter options are pre-fetched at build time
 * - Filtering happens entirely client-side (instant, no loading)
 * - URL params are used for shareable filter states
 */
export default async function Events({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Fetch ALL events and filter options in parallel at build time
  const [filterOptions, events] = await Promise.all([
    getEventFilterOptions(),
    getAllEvents(), // Fetches all pages (Strapi limits to 100 per page)
  ])

  return <EventsPageContent initialEvents={events as Event[]} filterOptions={filterOptions} />
}
