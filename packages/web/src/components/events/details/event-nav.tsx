import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { getLocale } from "next-intl/server"
import { getDateFnsLocale } from "@/libs/dates"
import type { Event, UploadFile } from "@/models/strapi"
import { getEventNav } from "../get.action"

interface NavEvent {
  slug: string
  name: string
  image?: UploadFile
  date?: Date | string
}

export default async function EventNav({ current }: { current: string }) {
  const locale = await getLocale()
  const events = (await getEventNav()) as Event[]
  const index = events.findIndex((e) => e.slug === current)

  // If event not found in list, show no navigation
  if (index === -1) {
    return <nav className="event-profile-nav" />
  }

  const previous = index > 0 ? mapToNavEvent(events[index - 1]) : null
  const next = index < events.length - 1 ? mapToNavEvent(events[index + 1]) : null

  return (
    <nav className="event-profile-nav">
      {previous ? (
        <Link
          href={`/events/${previous.slug}`}
          className="event-profile-nav__link event-profile-nav__link--prev"
        >
          <i className="bx bx-chevron-left event-profile-nav__icon" />
          {previous.image && (
            <Image
              src={previous.image.url}
              alt={previous.name}
              width={40}
              height={40}
              className="event-profile-nav__image"
              unoptimized
            />
          )}
          <div className="event-profile-nav__info">
            <span className="event-profile-nav__name">{previous.name}</span>
            {previous.date && (
              <span className="event-profile-nav__date">{formatDate(previous.date, locale)}</span>
            )}
          </div>
        </Link>
      ) : (
        <div className="event-profile-nav__placeholder" />
      )}

      {next ? (
        <Link
          href={`/events/${next.slug}`}
          className="event-profile-nav__link event-profile-nav__link--next"
        >
          <div className="event-profile-nav__info">
            <span className="event-profile-nav__name">{next.name}</span>
            {next.date && (
              <span className="event-profile-nav__date">{formatDate(next.date, locale)}</span>
            )}
          </div>
          {next.image && (
            <Image
              src={next.image.url}
              alt={next.name}
              width={40}
              height={40}
              className="event-profile-nav__image"
              unoptimized
            />
          )}
          <i className="bx bx-chevron-right event-profile-nav__icon" />
        </Link>
      ) : (
        <div className="event-profile-nav__placeholder" />
      )}
    </nav>
  )
}

function mapToNavEvent(event: Event): NavEvent {
  return {
    slug: event.slug,
    name: event.name || "",
    image: event.defaultImage as UploadFile,
    date: event.start,
  }
}

function formatDate(date: Date | string, locale?: string): string {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return format(parsed, "MMM d, yyyy", { locale: getDateFnsLocale(locale) })
}
