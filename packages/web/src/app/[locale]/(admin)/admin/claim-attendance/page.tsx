import { redirect } from "next/navigation"

/**
 * Redirect from old claim-attendance page to the unified Events page with Claims tab
 */
export default function ClaimAttendancePage() {
  redirect("/admin/events?tab=claims")
}
