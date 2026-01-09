"use server"

import { strapiFetch } from "@/libs/strapi-client"
import type { TimetableDay, ActionResult } from "./schedule.types"

// Re-export types for convenience (types can be re-exported from server files)
export type { DayOfWeek, Timeslot, TimetableDay, ActionResult } from "./schedule.types"

/**
 * Update event schedule (timetable)
 */
export async function updateEventSchedule(
  slug: string,
  timetable: TimetableDay[]
): Promise<ActionResult<TimetableDay[]>> {
  const result = await strapiFetch<{ data: TimetableDay[] }>(
    "/events/:slug/schedule",
    { slug },
    {
      method: "PUT",
      body: { data: { timetable } },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to update schedule",
    }
  }

  return {
    success: true,
    data: result.data?.data,
  }
}
