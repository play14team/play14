import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/libs/auth"
import AttendanceClaimsList from "./attendance-claims-list"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.claims.attendance")
  return {
    title: t("title"),
  }
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

  const t = await getTranslations("adminMisc.claims.attendance")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <AttendanceClaimsList />
    </div>
  )
}
