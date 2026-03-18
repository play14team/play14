import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import SponsorCreateForm from "./sponsor-create-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("sponsors.create.title") }
}

export default async function SponsorCreatePage() {
  await requireOrganizer()
  const t = await getTranslations("adminCrud")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/sponsors"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("sponsors.create.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("sponsors.create.title")}</h1>
              <p>{t("sponsors.create.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <SponsorCreateForm />
    </div>
  )
}
