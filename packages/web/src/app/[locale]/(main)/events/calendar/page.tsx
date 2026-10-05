import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import EventCalendar, { type CalendarEvent } from "@/components/events/calendar"
import { getEventCalendar } from "@/components/events/get.action"
import Page from "@/components/layout/page"
import { pageMetadata } from "@/libs/seo"
import type { LocaleParamsProps } from "@/libs/slug-params"
import type { Event } from "@/models/strapi"

export async function generateMetadata({ params }: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "events" })
  return pageMetadata({ locale, pathname: "/events/calendar", title: t("calendarTitle") })
}

export default async function Calendar() {
  const t = await getTranslations("events")
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
    <Page name={t("calendarTitle")}>
      <EventCalendar events={events} />
    </Page>
  )
}
