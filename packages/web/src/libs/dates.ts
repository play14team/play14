import { TZDate } from "@date-fns/tz"
import { format, type Locale } from "date-fns"
import { de, enUS, es, fr, it } from "date-fns/locale"
import type { Maybe } from "@/models/strapi"

const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  fr,
  es,
  de,
  it,
}

export function getDateFnsLocale(locale?: string): Locale {
  return dateFnsLocales[locale || "en"] || enUS
}

export function formatDate(
  start: Date | string,
  end: Date | string,
  timezone: Maybe<string> | undefined,
  displayYear?: boolean,
  locale?: string
) {
  const firstFormat = "MMMM dd"
  const tz = timezone || "UTC"
  const startDate = new TZDate(typeof start === "string" ? new Date(start) : start, tz)
  const endDate = new TZDate(typeof end === "string" ? new Date(end) : end, tz)
  const secondFormat = `${
    startDate.getMonth() !== endDate.getMonth() ? "MMMM " : ""
  }dd ${displayYear ? "yyyy" : ""}`

  const loc = getDateFnsLocale(locale)

  return `${format(startDate, firstFormat, { locale: loc })}-${format(endDate, secondFormat, { locale: loc })}`
}
