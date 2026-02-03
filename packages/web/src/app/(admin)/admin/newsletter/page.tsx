import type { Metadata } from "next"
import { requireFounder } from "@/libs/auth"
import NewsletterManager from "./newsletter-manager"

export const metadata: Metadata = {
  title: "Newsletter",
}

export default async function NewsletterPage() {
  await requireFounder()

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1>Newsletter</h1>
        <p>Create and send newsletters to the #play14 community</p>
      </div>

      <NewsletterManager />
    </div>
  )
}
