import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import { getLocationForEdit } from "../locations.action"
import LocationEditForm from "./location-edit-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("locations.edit.title") }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LocationEditPage({ params }: PageProps) {
  await requireOrganizer()
  const { id } = await params
  const t = await getTranslations("adminCrud")

  const location = await getLocationForEdit(id)

  if (!location) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/locations"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("locations.edit.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("locations.edit.title")}</h1>
              <p>{location.name}</p>
            </div>
          </div>
        </div>
      </div>

      <LocationEditForm location={location} />
    </div>
  )
}
