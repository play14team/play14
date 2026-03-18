import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import SponsorsList from "./sponsors-list"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("sponsors.title") }
}

export default async function SponsorsPage() {
  await requireOrganizer()
  const t = await getTranslations("adminCrud")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("sponsors.title")}</h1>
        <p>{t("sponsors.subtitle")}</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <SponsorsList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>{t("common.quickActions")}</h3>
              <Link
                href="/admin/sponsors/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus" />
                {t("sponsors.create.title")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
