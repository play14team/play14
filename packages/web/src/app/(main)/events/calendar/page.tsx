import type { Metadata } from "next"
import EventCalendar, { type CalendarEvent } from "@/components/events/calendar"
import { getEventCalendar } from "@/components/events/get.action"
import Page from "@/components/layout/page"
import type { Event } from "@/models/strapi"

export const metadata: Metadata = {
  title: "Events | Calendar",
}

export default async function Calendar() {
  const eventsData = (await getEventCalendar()) as Event[]
  const events = eventsData
    .filter((event) => event)
    .map((event) => ({
      title: (
        <div>
          <b>{event.name}</b> - {event.eventStatus}
          <br />
          {event.venue?.name}
        </div>
      ),
      start: new Date(event.start),
      end: new Date(event.end),
      tooltip: event.name,
      slug: event.slug,
      eventStatus: event.eventStatus,
    })) as CalendarEvent[]

  return (
    <Page name="Event calendar">
      <EventCalendar events={events} />
    </Page>
  )
}
