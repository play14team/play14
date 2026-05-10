import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Enum_Componenteventsmedia_Type,
  Enum_Event_Eventstatus,
  type Event,
  type Venue,
} from "@/models/strapi"
import SocialLinks from "../../layout/social-links"
import ICalendar from "../ical"
import EventTime from "../time"

interface EventInfoProps {
  event: Event
  venue?: Venue
  country?: string
}

export default function EventInfo({ event, venue, country }: EventInfoProps) {
  const t = useTranslations("events")
  const eventName = encodeURI(event.name!)
  const shareText = encodeURI("Take a look at #play14 ") + eventName

  // Registration logic
  const ticketingMode = event.ticketingMode || "none"
  const hasWidget = !!event.registration?.widgetCode
  const hasExternalLink = !!event.registration?.link
  const shouldScrollToRegistration =
    ticketingMode === "internal" || (ticketingMode === "external" && hasWidget)
  const shouldOpenExternalLink = ticketingMode === "external" && !hasWidget && hasExternalLink

  // Media links
  const photosAlbum = event.media?.find(
    (medium) => medium?.mediaType === Enum_Componenteventsmedia_Type.Photos
  )
  const videosLibrary = event.media?.find(
    (medium) => medium?.mediaType === Enum_Componenteventsmedia_Type.Videos
  )

  const isOpen = event.eventStatus === Enum_Event_Eventstatus.Open
  const isAnnounced = event.eventStatus === Enum_Event_Eventstatus.Announced
  const isCancelled = event.eventStatus === Enum_Event_Eventstatus.Cancelled
  const isOver = event.eventStatus === Enum_Event_Eventstatus.Over
  const canAddToCalendar = !isCancelled && !isOver

  // Filter resources - only show media that are not Photos/Videos and have a valid URL
  const resourceLinks = (event.media || []).filter(
    (medium) =>
      medium?.url &&
      medium.mediaType !== Enum_Componenteventsmedia_Type.Photos &&
      medium.mediaType !== Enum_Componenteventsmedia_Type.Videos
  )

  return (
    <div className="event-profile-info">
      {/* Column 1 - Venue */}
      <div className="event-profile-info__column">
        <h3 className="event-profile-info__section-title">
          <i className="bx bx-map-pin" />
          {t("details.venue")}
        </h3>
        <div className="event-profile-info__venue">
          {venue ? (
            <>
              <span className="event-profile-info__venue-name">
                {venue.website ? (
                  <Link href={venue.website} target="_blank" rel="noopener noreferrer">
                    {venue.name}
                  </Link>
                ) : (
                  venue.name
                )}
              </span>
              {venue.addressDetails && (
                <span className="event-profile-info__venue-address">{venue.addressDetails}</span>
              )}
              {venue.location?.place_name && (
                <span className="event-profile-info__venue-location">
                  {venue.location.place_name}
                </span>
              )}
            </>
          ) : (
            <span className="event-profile-info__venue-tbd">{t("details.venueTbd")}</span>
          )}
          {country && <span className="event-profile-info__venue-country">{country}</span>}
        </div>

        {/* Additional media links - only show if there are valid resource URLs */}
        {resourceLinks.length > 0 && (
          <div className="event-profile-info__resources-section">
            <h3 className="event-profile-info__section-title">
              <i className="bx bx-link" />
              {t("details.resources")}
            </h3>
            <div className="event-profile-info__resources">
              {resourceLinks.map((medium) => (
                <Link
                  key={medium.id}
                  href={medium.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-profile-info__resource-link"
                >
                  {medium.mediaType}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Column 2 - Schedule */}
      <div className="event-profile-info__column">
        <h3 className="event-profile-info__section-title">
          <i className="bx bx-time-five" />
          {t("details.schedule")}
        </h3>
        <div className="event-profile-info__schedule">
          <div className="event-profile-info__schedule-row">
            <span className="event-profile-info__schedule-label">{t("details.start")}</span>
            <span className="event-profile-info__schedule-value">
              <EventTime time={event.start} timezone={event.timezone!} />
            </span>
          </div>
          <div className="event-profile-info__schedule-row">
            <span className="event-profile-info__schedule-label">{t("details.end")}</span>
            <span className="event-profile-info__schedule-value">
              <EventTime time={event.end} timezone={event.timezone!} />
            </span>
          </div>
          {event.timezone && (
            <div className="event-profile-info__schedule-row">
              <span className="event-profile-info__schedule-label">{t("details.timezone")}</span>
              <span className="event-profile-info__schedule-value">{event.timezone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Column 3 - Actions */}
      <div className="event-profile-info__actions">
        {/* Registration button */}
        {isOpen && shouldScrollToRegistration && (
          <a
            href="#registration-heading"
            className="event-profile-info__action-btn event-profile-info__action-btn--primary"
          >
            <i className="bx bx-purchase-tag" />
            {t("details.getTickets")}
          </a>
        )}

        {isOpen && shouldOpenExternalLink && (
          <Link
            href={event.registration!.link!}
            target="_blank"
            rel="noopener noreferrer"
            className="event-profile-info__action-btn event-profile-info__action-btn--primary"
          >
            <i className="bx bx-user-plus" />
            {t("details.registerNow")}
          </Link>
        )}

        {/* Contact team */}
        {event.contactEmail && (
          <Link
            href={`mailto:${event.contactEmail}`}
            className="event-profile-info__action-btn event-profile-info__action-btn--secondary"
          >
            <i className="bx bx-envelope" />
            {t("details.contactTeam")}
          </Link>
        )}

        {/* Add to calendar */}
        {canAddToCalendar && <ICalendar event={event} asButton={true} />}

        {/* Photos album */}
        {photosAlbum?.url && (
          <Link
            href={photosAlbum.url}
            target="_blank"
            rel="noopener noreferrer"
            className="event-profile-info__action-btn event-profile-info__action-btn--accent"
          >
            <i className="bx bx-images" />
            {t("details.viewPhotos")}
          </Link>
        )}

        {/* Videos library */}
        {videosLibrary?.url && (
          <Link
            href={videosLibrary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="event-profile-info__action-btn event-profile-info__action-btn--accent"
          >
            <i className="bx bx-play-circle" />
            {t("details.watchVideos")}
          </Link>
        )}

        {/* Share section */}
        {(isOpen || isAnnounced) && (
          <div className="event-profile-info__share">
            <span className="event-profile-info__share-label">{t("details.shareThisEvent")}</span>
            <SocialLinks text={shareText} className="event-profile-info__share-links" />
          </div>
        )}
      </div>
    </div>
  )
}
