"use client"

import { deduplicateBy } from "@/libs/arrays"
import type { Event as EventType } from "@/models/strapi"
import { useMemo } from "react"
import EventGrid from "../events/grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

interface PlayerProfileTabsProps {
  attended: EventType[]
  hosted: EventType[]
  mentored: EventType[]
}

// Sort events by start date (most recent first)
function sortByDateDesc(events: EventType[]): EventType[] {
  return [...events].sort((a, b) => {
    const dateA = a.start ? new Date(a.start).getTime() : 0
    const dateB = b.start ? new Date(b.start).getTime() : 0
    return dateB - dateA
  })
}

export default function PlayerProfileTabs({ attended, hosted, mentored }: PlayerProfileTabsProps) {
  // Merge all events (attended + hosted + mentored) with deduplication, sorted by date
  const allEvents = useMemo(() => {
    const deduplicated = deduplicateBy(
      (event) => event.documentId || event.slug,
      attended,
      hosted,
      mentored
    )
    return sortByDateDesc(deduplicated)
  }, [attended, hosted, mentored])

  // Sort individual lists by date as well
  const sortedHosted = useMemo(() => sortByDateDesc(hosted), [hosted])
  const sortedMentored = useMemo(() => sortByDateDesc(mentored), [mentored])

  return (
    <div className="player-profile-content">
      <Tabs defaultValue="attended" className="player-profile-content__tabs">
        <TabsList>
          <TabsTrigger value="attended">
            Attended
            {allEvents.length > 0 && (
              <span className="player-profile-content__tab-count">{allEvents.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="hosted">
            Hosted
            {sortedHosted.length > 0 && (
              <span className="player-profile-content__tab-count">{sortedHosted.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mentored">
            Mentored
            {sortedMentored.length > 0 && (
              <span className="player-profile-content__tab-count">{sortedMentored.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attended">
          {allEvents.length > 0 ? (
            <EventGrid events={allEvents} />
          ) : (
            <EmptyState
              icon="bx-calendar-check"
              text="No events attended yet. The adventure is just beginning!"
            />
          )}
        </TabsContent>

        <TabsContent value="hosted">
          {sortedHosted.length > 0 ? (
            <EventGrid events={sortedHosted} />
          ) : (
            <EmptyState icon="bx-microphone" text="No events hosted yet. Maybe someday?" />
          )}
        </TabsContent>

        <TabsContent value="mentored">
          {sortedMentored.length > 0 ? (
            <EventGrid events={sortedMentored} />
          ) : (
            <EmptyState icon="bx-bulb" text="No events mentored yet. The wisdom is building up!" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="player-profile-content__empty">
      <i className={`bx ${icon} player-profile-content__empty-icon`} />
      <p className="player-profile-content__empty-text">{text}</p>
    </div>
  )
}
