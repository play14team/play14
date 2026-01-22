import Filters from "@/components/events/filters"
import { getAllEvents, getEventLocationSlugs } from "@/components/events/get.action"
import EventGrid from "@/components/events/grid"

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const locations = await getEventLocationSlugs()
  console.log(`[Build] Pre-generating ${locations.length} event location pages`)
  return locations.map((location) => ({ location }))
}

export default async function EventLocation(props: {
  params: Promise<{ location: string }>
}) {
  const params = await props.params
  const events = await getAllEvents(undefined, params.location)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name={`Found ${events.length} events in ${events[0]?.location?.name}`} />
      </div>
      <div className="pt-70">
        <EventGrid events={events} />
      </div>
    </>
  )
}
