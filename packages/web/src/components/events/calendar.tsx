"use client"

import { format, getDay, parse, startOfWeek } from "date-fns"
import type { Locale } from "date-fns/locale"
import { enUS } from "date-fns/locale/en-US"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import {
  Calendar,
  dateFnsLocalizer,
  type Event,
  type NavigateAction,
  Views,
} from "react-big-calendar"
import { mapColor } from "./popup"

const locales = {
  "en-US": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date, locale: Locale) => startOfWeek(date, { weekStartsOn: 1, locale }),
  getDay,
  locales,
})

interface EventCalendarProps {
  events: CalendarEvent[]
}

export interface CalendarEvent extends Event {
  slug: string
  tooltip: string
  eventStatus?: string
}

export default function EventCalendar({ events }: EventCalendarProps) {
  const router = useRouter()
  const [date, setDate] = useState(new Date())
  const views = [Views.MONTH]

  const onDoubleClickEvent = (event: { slug: string }) => {
    router.push(`/events/${event.slug}`)
  }

  const onNavigate = useCallback((newDate: Date, _view: string, _action: NavigateAction) => {
    setDate(newDate)
  }, [])

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const backgroundColor = mapColor(event.eventStatus)
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: "#fff",
      },
    }
  }, [])

  return (
    <div className="pt-70 pb-100">
      <h1>Calendar</h1>
      <Calendar
        localizer={localizer}
        events={events}
        date={date}
        onNavigate={onNavigate}
        defaultView="month"
        views={views}
        startAccessor="start"
        endAccessor="end"
        tooltipAccessor="tooltip"
        onDoubleClickEvent={onDoubleClickEvent}
        eventPropGetter={eventPropGetter}
        style={{ height: 700 }}
      />
    </div>
  )
}
