import moment from "moment"
import { Event } from "@/models/strapi"
import EventGrid from "../events/grid"
import { getUpcomingEvents } from "./get.action"

const UpcomingEvents = async () => {
  const today = moment().format()
  const events = (await getUpcomingEvents(today)) as Event[]

  return (
    <div className="container pt-70 pb-70">
      {events && <EventGrid events={events} />}
    </div>
  )
}

export default UpcomingEvents
