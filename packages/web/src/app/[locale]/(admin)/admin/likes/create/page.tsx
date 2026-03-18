import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireFounder } from "@/libs/auth"
import LikedItemCreateForm from "./liked-item-create-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("likes.create.title") }
}

export default async function LikedItemCreatePage() {
  await requireFounder()
  const t = await getTranslations("adminCrud")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/likes"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("likes.create.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("likes.create.title")}</h1>
              <p>{t("likes.create.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <LikedItemCreateForm />
    </div>
  )
}
