import clm from "country-locale-map"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import ReactCountryFlag from "react-country-flag"
import type { Event } from "@/models/strapi"
import defaultEvent from "@/styles/images/events/event1.jpg"
import EventDate from "./date"
import EventStatus from "./status"

interface EventCardProps {
  event: Event
  isPending?: boolean
}

const EventCard = ({ event, isPending }: EventCardProps) => {
  const t = useTranslations("events")
  const url = `/events/${encodeURIComponent(event.slug)}`
  const image = event.defaultImage || "#"
  const countryCode = event.location?.country || "LU"
  const countryName = clm.getCountryNameByAlpha2(countryCode)

  return (
    <article id={event.name} key={event.name} className="col-lg-4 col-sm-6 col-md-6">
      <div className="single-events-box shadow" style={{ borderRadius: "10px" }}>
        <div className="image" style={{ position: "relative", height: "300px" }}>
          <Link href={url} prefetch={false} className="d-block">
            {typeof image === "object" && image.url && (
              <Image
                src={image.url}
                alt={image.name}
                width={image.width || 400}
                height={image.height || 400}
                sizes="100vw"
                style={{
                  objectFit: "cover",
                  borderRadius: "10px 10px 0px 0px",
                  maxWidth: "100%",
                  height: "300px",
                }}
                unoptimized
              />
            )}
            {!image && (
              <Image
                src={defaultEvent}
                alt={"default event image"}
                placeholder="blur"
                style={{
                  objectFit: "cover",
                  borderRadius: "10px 10px 0px 0px",
                  maxWidth: "100%",
                  maxHeight: "300px",
                }}
                unoptimized
              />
            )}
          </Link>
          <span className="date">
            <EventDate start={event.start} end={event.end} timezone={event.timezone} displayYear />
          </span>
        </div>

        <div className="content">
          <h3>
            <Link href={url} prefetch={false}>
              {event.name}
            </Link>
          </h3>
          <ul className="d-flex list-unstyled justify-content-between">
            <li>
              {countryName && (
                <span className="location" style={{ padding: "0px" }}>
                  <ReactCountryFlag
                    countryCode={countryCode}
                    svg
                    title={countryName}
                    aria-label={countryName}
                    style={{
                      marginRight: "7px",
                      marginBottom: "4px",
                      width: "25px",
                    }}
                  />
                  {countryName}
                </span>
              )}
              {!countryName && (
                <span className="location">
                  <i className="bx bx-world" aria-hidden="true" /> {event.location?.name}
                </span>
              )}
            </li>
            <li>
              <span className="location">
                {isPending ? (
                  <span className="event-status event-status-pending">
                    <i className="bx bx-time-five" aria-hidden="true" /> {t("status.pending")}
                  </span>
                ) : (
                  <EventStatus status={event.eventStatus} />
                )}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </article>
  )
}

export default EventCard
