import Link from "next/link"
import { Enum_Componenteventsmedia_Type, Enum_Event_Eventstatus, Event } from "@/models/strapi"
import SocialLinks from "../layout/social-links"
import EventStatus from "./status"
import EventTime from "./time"
import ICalendar from "./ical"

const EventSidebar = ({ event }: { event: Event }) => {
  const eventName = encodeURI(event.name!)
  const text = encodeURI("Take a look at #play14 ") + eventName

  // Registration button logic:
  // - internal: scroll to registration section (Stripe tickets)
  // - external with widget: scroll to registration section (embedded widget)
  // - external with link only: open external link
  // - none: no button
  const ticketingMode = event.ticketingMode || "none"
  const hasWidget = !!event.registration?.widgetCode
  const hasExternalLink = !!event.registration?.link
  const shouldScrollToRegistration =
    ticketingMode === "internal" || (ticketingMode === "external" && hasWidget)
  const shouldOpenExternalLink =
    ticketingMode === "external" && !hasWidget && hasExternalLink

  // Find photos album URL from media
  const photosAlbum = event.media?.find(
    (medium) => medium?.type === Enum_Componenteventsmedia_Type.Photos
  )

  // Find videos library URL from media
  const videosLibrary = event.media?.find(
    (medium) => medium?.type === Enum_Componenteventsmedia_Type.Videos
  )

  return (
    <aside className="events-details-info">
      <h4 className="orange pb-3" style={{ textAlign: "center" }}>
        <EventStatus status={event.eventStatus} />
      </h4>
      <ul className="info">
        <li>
          <div className="d-flex justify-content-between align-items-center">
            <span>Start</span>
            <EventTime time={event.start} timezone={event.timezone!} />
          </div>
        </li>
        <li>
          <div className="d-flex justify-content-between align-items-center">
            <span>End</span>
            <EventTime time={event.end} timezone={event.timezone!} />
          </div>
        </li>
        {event.timezone && (
          <li>
            <div className="d-flex justify-content-between align-items-center">
              <span>Timezone</span>
              {event.timezone}
            </div>
          </li>
        )}
        {/* <li>
          <div className="d-flex justify-content-between align-items-center">
            <span>Registered</span>
            {participants.length}
          </div>
        </li> */}

        {event.media &&
          event.media.map(
            (medium) =>
              medium &&
              medium.type !== Enum_Componenteventsmedia_Type.Photos &&
              medium.type !== Enum_Componenteventsmedia_Type.Videos && (
                <li key={medium.id}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{medium.type}</span>
                    <Link href={medium.url || "#"} target="_blank" rel="noopener noreferrer">
                      {medium.url || "Link"}
                    </Link>
                  </div>
                </li>
              )
          )}
      </ul>

      {/* Registration button - scrolls to section for internal/widget, opens link for external link only */}
      {event.eventStatus == Enum_Event_Eventstatus.Open && shouldScrollToRegistration && (
        <div className="btn-box">
          <a href="#registration-heading" className="default-btn">
            <i className="flaticon-price-tag"></i>Get Tickets
          </a>
        </div>
      )}

      {event.eventStatus == Enum_Event_Eventstatus.Open && shouldOpenExternalLink && (
        <div className="btn-box">
          <Link
            href={event.registration!.link!}
            target="_blank"
            rel="noopener noreferrer"
            className="default-btn"
          >
            <i className="flaticon-user"></i>Book Now
          </Link>
        </div>
      )}

      {event.contactEmail && (
        <div className="btn-box">
          <Link
            href={`mailto:${event.contactEmail}`}
            className="default-btn btn-gray"
            aria-label="Send email to event team"
          >
            <i className="flaticon-team"></i>Contact Team
          </Link>
        </div>
      )}

      {event.eventStatus !== Enum_Event_Eventstatus.Cancelled &&
        event.eventStatus !== Enum_Event_Eventstatus.Over && (
          <div className="btn-box">
            <ICalendar event={event} asButton={true} />
          </div>
        )}

      {photosAlbum?.url && (
        <div className="btn-box">
          <Link
            href={photosAlbum.url}
            target="_blank"
            rel="noopener noreferrer"
            className="default-btn btn-green"
            aria-label="View event photos album"
          >
            <i className="flaticon-view"></i>View Photos
          </Link>
        </div>
      )}

      {videosLibrary?.url && (
        <div className="btn-box">
          <Link
            href={videosLibrary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="default-btn btn-blue"
            aria-label="View event videos library"
          >
            <i className="flaticon-google-play"></i>View Videos
          </Link>
        </div>
      )}

      {(event.eventStatus == Enum_Event_Eventstatus.Open ||
        event.eventStatus == Enum_Event_Eventstatus.Announced) && (
        <div className="events-share">
          <div className="share-info">
            <span>
              Share this event <i className="flaticon-share"></i>
            </span>
            <SocialLinks text={text} className="social-link" />
          </div>
        </div>
      )}
    </aside>
  )
}

export default EventSidebar
