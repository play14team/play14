import type { Maybe } from "@/models/strapi"
import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

export function formatDate(
  start: Date | string,
  end: Date | string,
  timezone: Maybe<string> | undefined,
  displayYear?: boolean
) {
  const firstFormat = "MMMM dd"
  const tz = timezone || "UTC"
  const startDate = new TZDate(start, tz)
  const endDate = new TZDate(end, tz)
  const secondFormat = `${
    startDate.getMonth() !== endDate.getMonth() ? "MMMM " : ""
  }dd ${displayYear ? "yyyy" : ""}`

  return `${format(startDate, firstFormat)}-${format(endDate, secondFormat)}`
}
