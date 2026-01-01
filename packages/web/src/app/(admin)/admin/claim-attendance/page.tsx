import { requireAuth } from "@/libs/auth"
import type { Metadata } from "next"
import ClaimAttendanceContent from "./claim-attendance-content"

export const metadata: Metadata = {
  title: "Claim Event Attendance",
}

export default async function ClaimAttendancePage() {
  // Require authentication with linked player
  await requireAuth("/admin/claim-attendance")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Claim Event Attendance</h1>
        <p>Request to be listed as an attendee for past events</p>
      </div>

      <ClaimAttendanceContent />
    </div>
  )
}
