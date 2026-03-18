import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/libs/auth"
import PlayerLinkingFlow from "./_components/player-linking-flow"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.noPlayer")
  return {
    title: t("title"),
  }
}

export default async function NoPlayerPage() {
  const session = await requireAuth()

  return (
    <div className="admin-no-player">
      <div className="admin-no-player-card">
        <PlayerLinkingFlow userEmail={session.user.email} userName={session.user.username} />
      </div>
    </div>
  )
}
