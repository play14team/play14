import { useLocale } from "next-intl"
import { formatDate } from "@/libs/dates"
import type { Maybe } from "@/models/strapi"

interface EventDatesProps {
  start: Date | string
  end: Date | string
  timezone: Maybe<string> | undefined
  displayYear?: boolean
}

const EventDate = ({ start, end, timezone, displayYear }: EventDatesProps) => {
  const locale = useLocale()
  return <>{formatDate(start, end, timezone, displayYear, locale)}</>
}

export default EventDate
