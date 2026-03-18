import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { requireFounder } from "@/libs/auth"
import { getLikedItemForEdit } from "../liked-items.action"
import LikedItemEditForm from "./liked-item-edit-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCrud")
  return { title: t("likes.edit.title") }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LikedItemEditPage({ params }: PageProps) {
  await requireFounder()
  const { id } = await params
  const t = await getTranslations("adminCrud")

  const item = await getLikedItemForEdit(id)

  if (!item) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/likes"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("likes.edit.backTitle")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("likes.edit.title")}</h1>
              <p>{item.name}</p>
            </div>
          </div>
        </div>
      </div>

      <LikedItemEditForm item={item} />
    </div>
  )
}
