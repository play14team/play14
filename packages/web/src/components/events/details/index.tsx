import { deduplicateBy } from "@/libs/arrays"
import {
  Enum_Event_Eventstatus,
  type Event,
  type EventLocation,
  type Player,
  type UploadFile,
  type Venue,
} from "@/models/strapi"
import clm from "country-locale-map"
import Link from "next/link"
import { canEditEvent } from "./can-edit.action"
import EventHero from "./event-hero"
import EventInfo from "./event-info"
import EventMap from "./event-map"
import EventNav from "./event-nav"
import EventProfileTabs from "./event-profile-tabs"
import EventRegistration from "./event-registration"

export default async function EventDetails({ event }: { event: Event }) {
  const defaultImage = event.defaultImage as UploadFile
  const eventLocation = event.location as EventLocation
  const venue = event.venue as Venue
  const country = eventLocation?.country
    ? clm.getCountryNameByAlpha2(eventLocation.country)
    : undefined

  const players = (event.players || []) as Player[]
  const hosts = (event.hosts || []) as Player[]
  const mentors = (event.mentors || []) as Player[]
  const participants = deduplicateBy(
    (player) => player.documentId || player.slug || player.name,
    players,
    hosts,
    mentors
  )

  // Determine map location (prefer venue, fallback to event location)
  const mapLocation = venue?.location || eventLocation?.location

  // Status checks
  const isOpen = event.eventStatus === Enum_Event_Eventstatus.Open
  const isAnnounced = event.eventStatus === Enum_Event_Eventstatus.Announced
  const isUpcoming = isOpen || isAnnounced

  // Check if current user can edit this event
  const canEdit = await canEditEvent(event)

  return (
    <div className="event-profile">
      {/* Floating edit button - only for authorized users */}
      {canEdit && (
        <Link
          href={`/admin/events/${event.slug}`}
          className="event-profile__edit-btn"
          title="Edit event"
        >
          <i className="bx bx-edit" />
        </Link>
      )}

      <div className="container">
        {/* Navigation */}
        <EventNav current={event.slug} />

        {/* Hero section */}
        <EventHero
          event={event}
          image={defaultImage}
          country={country}
          countryCode={eventLocation?.country}
          showTimer={isUpcoming}
        />

        {/* Info card section */}
        <EventInfo event={event} venue={venue} country={country} />

        {/* Map section */}
        {mapLocation && (
          <EventMap
            location={mapLocation}
            zoom={venue?.location ? 15 : 12}
            popup={!!venue?.location}
          />
        )}

        {/* Registration section - only for open events */}
        {isOpen && <EventRegistration event={event} />}

        {/* Tabs section */}
        <EventProfileTabs
          event={event}
          participants={participants}
          hosts={hosts}
          mentors={mentors}
        />
      </div>
    </div>
  )
}
