import { requireOrganizer } from "@/libs/auth"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { getPlayerForEdit } from "../players.action"
import PlayerEditForm from "./player-edit-form"

export const metadata: Metadata = {
  title: "Edit Player",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlayerEditPage({ params }: PageProps) {
  const session = await requireOrganizer()
  const { id } = await params

  const player = await getPlayerForEdit(id)

  if (!player) {
    notFound()
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>Edit Player</h1>
          <p>{player.name}</p>
        </div>
        <Link href="/admin/players" className="admin-btn admin-btn-secondary">
          <i className="bx bx-arrow-back"></i>
          Back to Players
        </Link>
      </div>

      <PlayerEditForm player={player} currentUserPosition={session.player.position} />
    </div>
  )
}
