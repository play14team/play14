import Filters from "@/components/events/filters"
import { getAllEvents } from "@/components/events/get.action"
import EventGrid from "@/components/events/grid"

export const dynamicParams = true

export async function generateStaticParams() {
  // Event statuses are a fixed enum in Strapi
  const statuses = ["Announced", "Open", "Over", "Cancelled"]
  console.log(`[Build] Pre-generating ${statuses.length} event status pages`)
  return statuses.map((status) => ({ status }))
}

export default async function EventStatus(props: {
  params: Promise<{ status: string }>
}) {
  const params = await props.params
  const events = await getAllEvents(params.status)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name={`Found ${events.length} events with status "${params.status}"`} />
      </div>
      <div className="pt-70">
        <EventGrid events={events} />
      </div>
    </>
  )
}
