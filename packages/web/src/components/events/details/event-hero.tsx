import Image from "next/image"
import ReactCountryFlag from "react-country-flag"
import { Enum_Event_Eventstatus, type Event, type UploadFile } from "@/models/strapi"
import EventDate from "../date"
import EventStatus from "../status"
import EventTimer from "./event-timer"

interface EventHeroProps {
  event: Event
  image?: UploadFile
  country?: string
  countryCode?: string
  showTimer?: boolean
}

export default function EventHero({
  event,
  image,
  country,
  countryCode,
  showTimer,
}: EventHeroProps) {
  const hasImage = !!image?.url
  const isCancelled = event.eventStatus === Enum_Event_Eventstatus.Cancelled
  const isOver = event.eventStatus === Enum_Event_Eventstatus.Over

  return (
    <div className={`event-profile-hero ${!hasImage ? "event-profile-hero--no-image" : ""}`}>
      {/* Background image */}
      {hasImage && (
        <div className="event-profile-hero__image-wrapper">
          <Image
            src={image.url}
            alt={event.name || "Event image"}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            style={{ objectFit: "cover" }}
            priority
            className="event-profile-hero__image"
          />
          <div className="event-profile-hero__overlay" />
        </div>
      )}

      {/* Content overlay */}
      <div className="event-profile-hero__content">
        {/* Left side - Event info */}
        <div className="event-profile-hero__left">
          <div className="event-profile-hero__header">
            {/* Country flag */}
            {countryCode && (
              <ReactCountryFlag
                countryCode={countryCode}
                svg
                title={country}
                aria-label={country}
                className="event-profile-hero__flag"
              />
            )}

            {/* Status badge */}
            <span
              className={`event-profile-hero__status event-profile-hero__status--${event.eventStatus?.toLowerCase()}`}
            >
              <EventStatus status={event.eventStatus} />
            </span>
          </div>

          {/* Event title */}
          <h1 className="event-profile-hero__title">{event.name}</h1>

          {/* Date */}
          <div className="event-profile-hero__date">
            <i className="bx bx-calendar" />
            <EventDate start={event.start} end={event.end} timezone={event.timezone!} />
          </div>
        </div>

        {/* Right side - Timer for upcoming events */}
        {showTimer && !isCancelled && !isOver && (
          <div className="event-profile-hero__right">
            <EventTimer date={event.start} />
          </div>
        )}
      </div>
    </div>
  )
}
