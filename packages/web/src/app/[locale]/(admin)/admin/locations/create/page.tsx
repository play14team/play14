import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import LocationCreateForm from "./location-create-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("locations.create.title") }
}

export default async function LocationCreatePage() {
  await requireOrganizer()
  const t = await getTranslations("adminCrud")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/locations"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("locations.create.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("locations.create.title")}</h1>
              <p>{t("locations.create.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <LocationCreateForm />
    </div>
  )
}
