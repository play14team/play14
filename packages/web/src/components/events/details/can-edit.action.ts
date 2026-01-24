"use server"

import { getCurrentUser } from "@/libs/auth"
import type { Event, Player } from "@/models/strapi"

/**
 * Check if the current user can edit an event.
 * Returns true if the user is:
 * - A host of the event
 * - A mentor of the event
 * - A Founder
 */
export async function canEditEvent(event: Event): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user?.player) {
    return false
  }

  const player = user.player as Player
  const playerDocumentId = player.documentId

  // Founders can edit all events
  if (player.position === "Founder") {
    return true
  }

  // Check if user is a host
  const hosts = (event.hosts || []) as Player[]
  const isHost = hosts.some((h) => h.documentId === playerDocumentId)
  if (isHost) {
    return true
  }

  // Check if user is a mentor
  const mentors = (event.mentors || []) as Player[]
  const isMentor = mentors.some((m) => m.documentId === playerDocumentId)
  if (isMentor) {
    return true
  }

  return false
}
