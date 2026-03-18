import { getTranslations } from "next-intl/server"
import { requireOrganizer } from "@/libs/auth"
import PlayersPageContent from "./players-page-content"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.players")
  return {
    title: t("title"),
  }
}

export default async function PlayersPage() {
  await requireOrganizer()
  const t = await getTranslations("adminMisc.players")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <PlayersPageContent />
    </div>
  )
}
