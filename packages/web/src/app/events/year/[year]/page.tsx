import Filters from "@/components/events/filters"
import {
  getEventsByYear,
  getEventYearCounts,
} from "@/components/events/get.action"
import EventGrid from "@/components/events/grid"
import LoadMoreYear from "@/components/events/load-more-year"
import YearNav from "@/components/events/year-nav"
import { Event } from "@/models/strapi"
import { Metadata } from "next"
import { notFound } from "next/navigation"

interface YearEventsPageProps {
  params: Promise<{ year: string }>
}

export async function generateMetadata({
  params,
}: YearEventsPageProps): Promise<Metadata> {
  const { year } = await params
  return {
    title: `Events ${year}`,
  }
}

export const revalidate = 3600

export default async function YearEventsPage({ params }: YearEventsPageProps) {
  const { year: yearParam } = await params
  const year = parseInt(yearParam, 10)

  if (isNaN(year) || year < 2014 || year > new Date().getFullYear() + 5) {
    notFound()
  }

  const [response, yearCounts] = await Promise.all([
    getEventsByYear(year, 1, 18),
    getEventYearCounts(),
  ])

  const events = (response?.events_connection?.nodes || []) as Event[]
  const pagination = response?.events_connection?.pageInfo || {
    total: 0,
    page: 1,
    pageSize: 18,
    pageCount: 1,
  }

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name={`Events ${year}`} />
        <YearNav currentYear={year} yearCounts={yearCounts} />
        <p>Total: {pagination.total}</p>
      </div>
      {events.length > 0 ? (
        <>
          <EventGrid events={events} />
          <LoadMoreYear pagination={pagination} year={year} />
        </>
      ) : (
        <div className="centered pt-5 pb-5">
          <p>No events found for {year}</p>
        </div>
      )}
    </>
  )
}
