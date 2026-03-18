import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/libs/auth"
import EventsPageContent from "./events-page-content"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminEvents")
  return { title: t("list.title") }
}

export default async function EventsPage() {
  // Require authentication with linked player
  const session = await requireAuth("/admin/events")
  const t = await getTranslations("adminEvents")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("list.title")}</h1>
        <p>{t("list.description")}</p>
      </div>

      <EventsPageContent user={session.user} />
    </div>
  )
}
