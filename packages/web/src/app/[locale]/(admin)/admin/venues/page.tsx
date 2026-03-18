import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import VenuesList from "./venues-list"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("venues.title") }
}

export default async function VenuesPage() {
  await requireOrganizer()
  const t = await getTranslations("adminCrud")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("venues.title")}</h1>
        <p>{t("venues.subtitle")}</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <VenuesList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>{t("common.quickActions")}</h3>
              <Link
                href="/admin/venues/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus" />
                {t("venues.create.title")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
