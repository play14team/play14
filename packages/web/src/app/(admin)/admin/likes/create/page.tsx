import type { Metadata } from "next"
import Link from "next/link"
import { requireFounder } from "@/libs/auth"
import LikedItemCreateForm from "./liked-item-create-form"

export const metadata: Metadata = {
  title: "Add Liked Item",
}

export default async function LikedItemCreatePage() {
  await requireFounder()

  return (
    <div className="admin-page">
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
              <h1>Add Liked Item</h1>
              <p>Add something the community recommends</p>
            </div>
          </div>
        </div>
      </div>

      <LikedItemCreateForm />
    </div>
  )
}
