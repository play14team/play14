import moment from "moment"
import { Event } from "@/models/strapi"
import EventGrid from "../events/grid"
import { getUpcomingEvents } from "./get.action"

const UpcomingEvents = async () => {
  const today = moment().format()
  const events = (await getUpcomingEvents(today)) as Event[]

  return (
    <section className="funfacts-area pt-100">
      <div className="container">
        <div className="section-title">
          <h2>
            Join the <span>Movement</span>
          </h2>
          <p>
            Find your next #play14 experience and connect with players near you.
          </p>
        </div>
        <div className="pt-5 pb-70">
          {events && <EventGrid events={events} />}
        </div>
      </div>
    </section>
  )
}

export default UpcomingEvents
