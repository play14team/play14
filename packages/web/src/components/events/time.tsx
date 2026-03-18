import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"
import { useLocale } from "next-intl"
import { getDateFnsLocale } from "@/libs/dates"

const EventTime = ({ time, timezone }: { time: Date | string; timezone?: string }) => {
  const locale = useLocale()
  const formatPattern = "EEE, MMM d - HH:mm"
  const base = time instanceof Date ? time : new Date(time)
  const zone = timezone || "UTC"
  const date = new TZDate(base, zone)

  return format(date, formatPattern, { locale: getDateFnsLocale(locale) })
}

export default EventTime
