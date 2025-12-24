import Filters from "@/components/events/filters"
import { getEvents, getEventYearCounts } from "@/components/events/get.action"
import EventGrid from "@/components/events/grid"
import LoadMore from "@/components/events/load-more"
import YearNav from "@/components/events/year-nav"
import { Event } from "@/models/strapi"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Events",
}

export const revalidate = 3600

export default async function Events() {
  const [response, yearCounts] = await Promise.all([
    getEvents(1, 18),
    getEventYearCounts(),
  ])
  // In Strapi 5, events_connection returns nodes and pageInfo
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
        <Filters name="Events" />
        <YearNav yearCounts={yearCounts} />
        <p>Total: {pagination.total}</p>
      </div>
      <EventGrid events={events} />
      <LoadMore pagination={pagination} />
    </>
  )
}
