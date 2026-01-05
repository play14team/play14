"use server"

import { getAuthCookie } from "@/libs/auth"
import type { TimetableDay, ActionResult } from "./schedule.types"

const STRAPI_URL = process.env.STRAPI_API_URL || "http://localhost:1337"

// Re-export types for convenience (types can be re-exported from server files)
export type { DayOfWeek, Timeslot, TimetableDay, ActionResult } from "./schedule.types"

/**
 * Update event schedule (timetable)
 */
export async function updateEventSchedule(
  slug: string,
  timetable: TimetableDay[]
): Promise<ActionResult<TimetableDay[]>> {
  const jwt = await getAuthCookie()

  if (!jwt) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/events/${slug}/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: { timetable } }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error?.message || `Failed to update schedule (${response.status})`,
      }
    }

    const responseData = await response.json()
    return {
      success: true,
      data: responseData.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
