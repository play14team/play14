import Link from "next/link"
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
    (medium) => medium?.type === Enum_Componenteventsmedia_Type.Photos
  )
  const videosLibrary = event.media?.find(
    (medium) => medium?.type === Enum_Componenteventsmedia_Type.Videos
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
      medium.type !== Enum_Componenteventsmedia_Type.Photos &&
      medium.type !== Enum_Componenteventsmedia_Type.Videos
  )

  return (
    <div className="event-profile-info">
      {/* Column 1 - Venue */}
      <div className="event-profile-info__column">
        <h3 className="event-profile-info__section-title">
          <i className="bx bx-map-pin" />
          Venue
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
            <span className="event-profile-info__venue-tbd">Venue to be announced</span>
          )}
          {country && <span className="event-profile-info__venue-country">{country}</span>}
        </div>

        {/* Additional media links - only show if there are valid resource URLs */}
        {resourceLinks.length > 0 && (
          <div className="event-profile-info__resources-section">
            <h3 className="event-profile-info__section-title">
              <i className="bx bx-link" />
              Resources
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
                  {medium.type}
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
          Schedule
        </h3>
        <div className="event-profile-info__schedule">
          <div className="event-profile-info__schedule-row">
            <span className="event-profile-info__schedule-label">Start</span>
            <span className="event-profile-info__schedule-value">
              <EventTime time={event.start} timezone={event.timezone!} />
            </span>
          </div>
          <div className="event-profile-info__schedule-row">
            <span className="event-profile-info__schedule-label">End</span>
            <span className="event-profile-info__schedule-value">
              <EventTime time={event.end} timezone={event.timezone!} />
            </span>
          </div>
          {event.timezone && (
            <div className="event-profile-info__schedule-row">
              <span className="event-profile-info__schedule-label">Timezone</span>
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
            Get tickets
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
            Register now
          </Link>
        )}

        {/* Contact team */}
        {event.contactEmail && (
          <Link
            href={`mailto:${event.contactEmail}`}
            className="event-profile-info__action-btn event-profile-info__action-btn--secondary"
          >
            <i className="bx bx-envelope" />
            Contact team
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
            View photos
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
            Watch videos
          </Link>
        )}

        {/* Share section */}
        {(isOpen || isAnnounced) && (
          <div className="event-profile-info__share">
            <span className="event-profile-info__share-label">Share this event</span>
            <SocialLinks text={shareText} className="event-profile-info__share-links" />
          </div>
        )}
      </div>
    </div>
  )
}
