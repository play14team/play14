import Filters from "@/components/events/filters"
import EventGrid from "@/components/events/grid"
import YearNav from "@/components/events/year-nav"
import ScrollToTop from "@/components/layout/scroll-to-top"
import { Event } from "@/models/strapi"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getAllEventsByYear,
  getEventYearCounts,
} from "../../../../components/events/get.action"

export const metadata: Metadata = {
  title: "Events",
}

export const revalidate = 3600

export default async function EventsByYear(props: {
  params: Promise<{ year: string }>
}) {
  const params = await props.params
  const yearParam = parseInt(params.year, 10)

  // Fetch year counts for navigation
  const yearCounts = await getEventYearCounts()

  // Validate year parameter: must be a valid year with events
  if (
    isNaN(yearParam) ||
    yearParam < 1900 ||
    yearParam > 2100 ||
    !yearCounts[yearParam]
  ) {
    notFound()
  }

  // Fetch ALL events for this year
  const events = await getAllEventsByYear(yearParam)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name="Events" />
        <p>Total: {events.length}</p>
        <YearNav currentYear={yearParam} yearCounts={yearCounts} />
      </div>
      <EventGrid events={events} />
      <ScrollToTop />
    </>
  )
}
