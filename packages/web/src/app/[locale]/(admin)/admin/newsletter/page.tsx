import { getTranslations } from "next-intl/server"
import { requireFounder } from "@/libs/auth"
import NewsletterManager from "./newsletter-manager"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.newsletter")
  return {
    title: t("title"),
  }
}

export default async function NewsletterPage() {
  await requireFounder()
  const t = await getTranslations("adminMisc.newsletter")

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <NewsletterManager />
    </div>
  )
}
