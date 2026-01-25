"use server"

import type { FilterOption } from "@/components/filters"
import { restQuery } from "@/libs/strapi-client"

interface PlayerFilterData {
  name: string
  position?: string
}

/**
 * Player positions (hardcoded as these are the standard positions)
 */
const PLAYER_POSITIONS = ["player", "host", "mentor", "founder"]

const visibleFilter = {
  $or: [{ visible: { $eq: true } }, { visible: { $null: true } }],
}

/**
 * Get all filter options for the players page
 *
 * Returns positions with counts and letter counts
 */
export async function getPlayerFilterOptions(): Promise<{
  positions: FilterOption[]
  letters: FilterOption[]
}> {
  // Fetch ALL players with minimal data for counting
  // Strapi limits to 100 per page, so we need to paginate
  const allPlayers: PlayerFilterData[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<PlayerFilterData[]>("players", {
      fields: ["name", "position"],
      filters: visibleFilter,
      pagination: { page, pageSize },
    })

    const players = response.data || []
    allPlayers.push(...players)

    if (players.length < pageSize) {
      break
    }
    page++
  }

  const players = allPlayers

  // Count by position
  const positionCounts = new Map<string, number>()
  // Count by first letter
  const letterCounts = new Map<string, number>()

  for (const player of players) {
    // Position
    if (player.position) {
      const pos = player.position.toLowerCase()
      positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
    }

    // First letter
    if (player.name) {
      const firstLetter = player.name.charAt(0).toUpperCase()
      if (/[A-Z]/.test(firstLetter)) {
        letterCounts.set(firstLetter, (letterCounts.get(firstLetter) || 0) + 1)
      }
    }
  }

  // Build position options (in predefined order)
  const positions: FilterOption[] = PLAYER_POSITIONS.map((position) => ({
    value: position,
    label: position.charAt(0).toUpperCase() + position.slice(1), // Capitalize
    count: positionCounts.get(position) || 0,
  })).filter((p) => p.count > 0)

  // Build letter options (A-Z, only those with players)
  const letters: FilterOption[] = []
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i)
    const count = letterCounts.get(letter) || 0
    letters.push({
      value: letter,
      label: letter,
      count,
    })
  }

  return { positions, letters }
}
