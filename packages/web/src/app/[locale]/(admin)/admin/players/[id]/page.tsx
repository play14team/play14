import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { PlayerForm } from "@/components/admin/player-form"
import { Link } from "@/i18n/navigation"
import { requireOrganizer } from "@/libs/auth"
import { getPlayerForEdit, getPlayerSettings } from "../players.action"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.players")
  return {
    title: t("editPlayer"),
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlayerEditPage({ params }: PageProps) {
  const session = await requireOrganizer()
  const t = await getTranslations("adminMisc.players")
  const { id } = await params

  const [player, settings] = await Promise.all([getPlayerForEdit(id), getPlayerSettings(id)])

  if (!player) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/players"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title={t("backToPlayers")}
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>{t("editPlayer")}</h1>
              <p>{player.name}</p>
            </div>
          </div>
        </div>
      </div>

      <PlayerForm
        player={player}
        mode="admin"
        currentUserPosition={session.player.position ?? "Player"}
        adminSettings={settings}
      />
    </div>
  )
}
