import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { requireOrganizer } from "@/libs/auth"
import { getLocations, getVenues } from "./event-create.action"
import EventCreateForm from "./event-create-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminEvents")
  return {
    title: t("create.metaTitle"),
    robots: "noindex, nofollow",
  }
}

export default async function CreateEventPage() {
  await requireOrganizer("/admin/events/create")
  const t = await getTranslations("adminEvents")

  const [locations, venues] = await Promise.all([getLocations(), getVenues()])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("create.title")}</h1>
        <p>{t("create.description")}</p>
      </div>

      <EventCreateForm locations={locations} venues={venues} />
    </div>
  )
}
