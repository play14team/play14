import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PlayerForm } from "@/components/admin/player-form"
import { requireOrganizer } from "@/libs/auth"
import { getPlayerForEdit, getPlayerSettings } from "../players.action"

export const metadata: Metadata = {
  title: "Edit Player",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlayerEditPage({ params }: PageProps) {
  const session = await requireOrganizer()
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
              title="Back to Players"
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>Edit Player</h1>
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
