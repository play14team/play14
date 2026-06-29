import { formatISO } from "date-fns"
import { getTranslations } from "next-intl/server"
import type { Event } from "@/models/strapi"
import EventGrid from "../events/grid"
import { getUpcomingEvents } from "./get.action"

const UpcomingEvents = async () => {
  const today = formatISO(new Date())
  const events = (await getUpcomingEvents(today)) as Event[]
  const t = await getTranslations("home.upcomingEvents")

  return (
    <div className="container pt-70 pb-70">
      <div className="section-title">
        <h2>
          {t.rich("title", {
            span: (chunks) => <span>{chunks}</span>,
          })}
        </h2>
        <p>{t("subtitle")}</p>
      </div>
      {events && <EventGrid events={events} />}
    </div>
  )
}

export default UpcomingEvents
