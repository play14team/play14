import { getTranslations } from "next-intl/server"
import { requireFounder } from "@/libs/auth"
import ClaimsList from "./claims-list"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.claims.player")
  return {
    title: t("title"),
  }
}

export default async function ClaimsPage() {
  // Only Founders can access this page
  await requireFounder("/admin/claims")

  const t = await getTranslations("adminMisc.claims.player")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <ClaimsList />
    </div>
  )
}
