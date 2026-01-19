import type { Event } from "@/models/strapi"
import EventCard from "./card"

interface EventWithPending extends Event {
  isPending?: boolean
}

interface EventGridProps {
  events: EventWithPending[]
  pendingEventIds?: Set<string>
}

const EventGrid = ({ events, pendingEventIds }: EventGridProps) => {
  return (
    <div className="events-area">
      <div className="container">
        <div className="row">
          {events.map((event) => (
            <EventCard
              key={event.documentId}
              event={event}
              isPending={
                event.isPending ||
                !!(pendingEventIds && event.documentId && pendingEventIds.has(event.documentId))
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default EventGrid
