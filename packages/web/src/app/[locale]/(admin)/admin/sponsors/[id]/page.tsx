import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import { getSponsorForEdit } from "../sponsors.action"
import SponsorEditForm from "./sponsor-edit-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("sponsors.edit.title") }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SponsorEditPage({ params }: PageProps) {
  await requireOrganizer()
  const { id } = await params
  const t = await getTranslations("adminCrud")

  const sponsor = await getSponsorForEdit(id)

  if (!sponsor) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/sponsors"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("sponsors.edit.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("sponsors.edit.title")}</h1>
              <p>{sponsor.name}</p>
            </div>
          </div>
        </div>
      </div>

      <SponsorEditForm sponsor={sponsor} />
    </div>
  )
}
