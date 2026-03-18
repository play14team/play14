import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import { getVenueForEdit } from "../venues.action"
import VenueEditForm from "./venue-edit-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("venues.edit.title") }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VenueEditPage({ params }: PageProps) {
  await requireOrganizer()
  const { id } = await params
  const t = await getTranslations("adminCrud")

  const venue = await getVenueForEdit(id)

  if (!venue) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/venues"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("venues.edit.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("venues.edit.title")}</h1>
              <p>{venue.name}</p>
            </div>
          </div>
        </div>
      </div>

      <VenueEditForm venue={venue} />
    </div>
  )
}
