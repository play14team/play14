"use client"

import { useMemo } from "react"
import type {
  ComponentEventsSponsorship,
  ComponentEventsTimetable,
  Event,
  Maybe,
  Player,
} from "@/models/strapi"
import Gallery from "../../layout/gallery"
import HtmlContent from "../../layout/html-content"
import PlayerGrid from "../../players/grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import EventSchedule from "../schedule"
import EventSponsorships from "../sponsorships"

interface EventProfileTabsProps {
  event: Event
  participants: Player[]
  hosts: Player[]
  mentors: Player[]
}

export default function EventProfileTabs({
  event,
  participants,
  hosts,
  mentors,
}: EventProfileTabsProps) {
  // Runtime validation: Strapi API may return null/undefined instead of empty arrays
  // for unpopulated relations, despite TypeScript types suggesting otherwise.
  const timetable = Array.isArray(event.timetable)
    ? (event.timetable as Array<Maybe<ComponentEventsTimetable>>)
    : []
  const images = Array.isArray(event.images)
    ? (event.images.filter(Boolean) as Array<{ url: string; name?: string | null }>)
    : []

  // Log unexpected data shapes for monitoring API contract violations
  if (
    event.timetable !== null &&
    event.timetable !== undefined &&
    !Array.isArray(event.timetable)
  ) {
    console.warn("[EventProfileTabs] Expected array for timetable", {
      actualType: typeof event.timetable,
      eventSlug: event.slug,
    })
  }
  if (event.images !== null && event.images !== undefined && !Array.isArray(event.images)) {
    console.warn("[EventProfileTabs] Expected array for images", {
      actualType: typeof event.images,
      eventSlug: event.slug,
    })
  }

  // Memoize counts and checks
  const participantCount = useMemo(() => participants.length, [participants])
  const imageCount = useMemo(() => images.length, [images])
  const hasSchedule = useMemo(() => timetable.length > 0, [timetable])
  const hasOverviewContent = useMemo(
    () =>
      !!event.description ||
      (hosts && hosts.length > 0) ||
      (mentors && mentors.length > 0) ||
      (event.sponsorships && event.sponsorships.length > 0),
    [event.description, event.sponsorships, hosts, mentors]
  )

  // Default to schedule tab if no overview content
  const defaultTab = hasOverviewContent ? "overview" : "schedule"

  return (
    <div className="event-profile-content">
      <Tabs defaultValue={defaultTab} className="event-profile-content__tabs">
        <TabsList>
          <TabsTrigger value="overview">
            <i className="bx bx-info-circle" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <i className="bx bx-time" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="players">
            <i className="bx bx-group" />
            Players
            {participantCount > 0 && (
              <span className="event-profile-content__tab-count">{participantCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="photos">
            <i className="bx bx-images" />
            Photos
            {imageCount > 0 && (
              <span className="event-profile-content__tab-count">{imageCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="event-profile-content__overview">
            {/* Description */}
            {event.description && (
              <div className="event-profile-content__section">
                <div className="event-profile-content__description">
                  <HtmlContent>{event.description}</HtmlContent>
                </div>
              </div>
            )}

            {/* Team (Hosts) */}
            {hosts && hosts.length > 0 && (
              <div className="event-profile-content__section">
                <PlayerGrid title="Team" players={hosts} />
              </div>
            )}

            {/* Mentors */}
            {mentors && mentors.length > 0 && (
              <div className="event-profile-content__section">
                <PlayerGrid title="Mentors" players={mentors} />
              </div>
            )}

            {/* Sponsorships */}
            {event.sponsorships && event.sponsorships.length > 0 && (
              <div className="event-profile-content__section">
                <EventSponsorships
                  sponsorships={event.sponsorships as Array<ComponentEventsSponsorship>}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          {hasSchedule ? (
            <EventSchedule timetable={timetable} />
          ) : (
            <EmptyState
              icon="bx-time"
              text="The schedule for this event has not been published yet."
            />
          )}
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players">
          {participantCount > 0 ? (
            <PlayerGrid title="Players" players={participants} />
          ) : (
            <EmptyState icon="bx-group" text="No players have registered for this event yet." />
          )}
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos">
          {imageCount > 0 ? (
            <Gallery images={images} />
          ) : (
            <EmptyState icon="bx-images" text="No photos have been uploaded for this event yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="event-profile-content__empty">
      <i className={`bx ${icon} event-profile-content__empty-icon`} />
      <p className="event-profile-content__empty-text">{text}</p>
    </div>
  )
}
