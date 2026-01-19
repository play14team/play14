import { requireAuth } from "@/libs/auth"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import AttendanceClaimsList from "./attendance-claims-list"

export const metadata: Metadata = {
  title: "Review Attendance Claims",
}

export default async function AttendanceClaimsPage() {
  // Require authentication with linked player
  const session = await requireAuth("/admin/attendance-claims")

  // Check if user is a host or mentor (has organized events)
  const position = session.user.player?.position
  const isOrganizer = position === "Host" || position === "Mentor" || position === "Founder"

  if (!isOrganizer) {
    // If not an organizer, redirect to admin home
    redirect("/admin")
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Attendance Claims</h1>
        <p>Review and manage attendance claims for your events</p>
      </div>

      <AttendanceClaimsList />
    </div>
  )
}
