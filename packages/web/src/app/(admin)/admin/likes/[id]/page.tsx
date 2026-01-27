import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireFounder } from "@/libs/auth"
import { getLikedItemForEdit } from "../liked-items.action"
import LikedItemEditForm from "./liked-item-edit-form"

export const metadata: Metadata = {
  title: "Edit Liked Item",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LikedItemEditPage({ params }: PageProps) {
  await requireFounder()
  const { id } = await params

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
              title="Back to Likes"
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>Edit Liked Item</h1>
              <p>{item.name}</p>
            </div>
          </div>
        </div>
      </div>

      <LikedItemEditForm item={item} />
    </div>
  )
}
