"use server"

import { strapiFetch } from "@/libs/strapi-client"
import { revalidateEventPages } from "./event-edit.action"
import type { ActionResult, TimetableDay } from "./schedule.types"

// Re-export types for convenience (types can be re-exported from server files)
export type { ActionResult, DayOfWeek, Timeslot, TimetableDay } from "./schedule.types"

/**
 * Update event schedule (timetable)
 */
export async function updateEventSchedule(
  slug: string,
  timetable: TimetableDay[]
): Promise<ActionResult<TimetableDay[]>> {
  const result = await strapiFetch<{ data: TimetableDay[] }>(
    "/admin/events/:slug/schedule",
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

  // Revalidate public pages after successful update
  await revalidateEventPages(slug)

  return {
    success: true,
    data: result.data?.data,
  }
}
