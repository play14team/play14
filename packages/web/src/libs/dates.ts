import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"
import type { Maybe } from "@/models/strapi"

export function formatDate(
  start: Date | string,
  end: Date | string,
  timezone: Maybe<string> | undefined,
  displayYear?: boolean
) {
  const firstFormat = "MMMM dd"
  const tz = timezone || "UTC"
  const startDate = new TZDate(typeof start === "string" ? new Date(start) : start, tz)
  const endDate = new TZDate(typeof end === "string" ? new Date(end) : end, tz)
  const secondFormat = `${
    startDate.getMonth() !== endDate.getMonth() ? "MMMM " : ""
  }dd ${displayYear ? "yyyy" : ""}`

  return `${format(startDate, firstFormat)}-${format(endDate, secondFormat)}`
}
