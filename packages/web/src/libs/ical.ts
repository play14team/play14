import { TZDate } from "@date-fns/tz"
import type { DateArray } from "ics"

/**
 * Wall-clock date parts (`[year, month, day, hour, minute]`) for an absolute
 * instant, expressed in the given IANA timezone.
 *
 * `event.start`/`event.end` are absolute UTC instants; pairing these parts with
 * the ics `inputType: "local"` option emits the event at the venue's local time
 * instead of the time of whoever's browser generated the file.
 */
export function zonedDateParts(instant: Date, timezone: string): DateArray {
  const zoned = new TZDate(instant, timezone)
  return [
    zoned.getFullYear(),
    zoned.getMonth() + 1,
    zoned.getDate(),
    zoned.getHours(),
    zoned.getMinutes(),
  ]
}

/** Format a timezone's UTC offset for a given instant as `±HHMM` (e.g. `+0200`). */
function formatUtcOffset(instant: Date, timezone: string): string {
  // getTimezoneOffset() is minutes *behind* UTC, so negate to get the offset east of UTC.
  const minutesEast = -new TZDate(instant, timezone).getTimezoneOffset()
  const sign = minutesEast >= 0 ? "+" : "-"
  const abs = Math.abs(minutesEast)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  return `${sign}${hh}${mm}`
}

/**
 * Anchor a floating-time ICS string (generated with the ics `outputType:
 * "local"` option) to a named timezone: tag `DTSTART`/`DTEND` with `TZID` and
 * prepend a matching `VTIMEZONE` component.
 *
 * The ics library has no native timezone support, so we patch its output.
 * Calendar clients that recognise the IANA name (Google, Apple, Outlook)
 * localise the event correctly for every viewer; the embedded single-offset
 * `VTIMEZONE` (computed at the event start) is a fallback for clients that
 * don't, and is accurate unless the event itself straddles a DST transition.
 */
export function anchorIcsToTimezone(ics: string, timezone: string, startInstant: Date): string {
  const eol = ics.includes("\r\n") ? "\r\n" : "\n"
  const offset = formatUtcOffset(startInstant, timezone)
  const vtimezone = [
    "BEGIN:VTIMEZONE",
    `TZID:${timezone}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    `TZOFFSETFROM:${offset}`,
    `TZOFFSETTO:${offset}`,
    "END:STANDARD",
    "END:VTIMEZONE",
  ].join(eol)

  return ics
    .replace(/^DTSTART:/m, `DTSTART;TZID=${timezone}:`)
    .replace(/^DTEND:/m, `DTEND;TZID=${timezone}:`)
    .replace(/^BEGIN:VEVENT/m, `${vtimezone}${eol}BEGIN:VEVENT`)
}
