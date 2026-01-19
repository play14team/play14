import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

const EventTime = ({
  time,
  timezone,
}: {
  time: Date | string
  timezone?: string
}) => {
  const formatPattern = "EEE, MMM do - HH:mm"
  const base = time instanceof Date ? time.getTime() : time
  const zone = timezone || "UTC"
  const date = new TZDate(base, zone)

  return format(date, formatPattern)
}

export default EventTime
