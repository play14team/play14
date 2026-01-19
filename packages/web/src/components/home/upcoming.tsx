import type { Event } from "@/models/strapi"
import { formatISO } from "date-fns"
import EventGrid from "../events/grid"
import { getUpcomingEvents } from "./get.action"

const UpcomingEvents = async () => {
  const today = formatISO(new Date())
  const events = (await getUpcomingEvents(today)) as Event[]

  return <div className="container pt-70 pb-70">{events && <EventGrid events={events} />}</div>
}

export default UpcomingEvents
