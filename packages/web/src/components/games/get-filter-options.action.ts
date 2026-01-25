"use server"

import type { FilterOption } from "@/components/filters"
import { restQuery } from "@/libs/strapi-client"

interface GameFilterData {
  category?: string
  tags?: Array<{ value: string }>
}

/**
 * Get all filter options for the games page
 *
 * Returns categories and tags with counts
 */
export async function getGameFilterOptions(): Promise<{
  categories: FilterOption[]
  tags: FilterOption[]
}> {
  // Fetch ALL games with minimal data for counting
  // Strapi limits to 100 per page, so we need to paginate
  const allGames: GameFilterData[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<GameFilterData[]>("games", {
      fields: ["category"],
      populate: { tags: { fields: ["value"] } },
      pagination: { page, pageSize },
    })

    const games = response.data || []
    allGames.push(...games)

    if (games.length < pageSize) {
      break
    }
    page++
  }

  const games = allGames

  // Count by category (normalize to lowercase for deduplication, keep first seen label)
  const categoryCounts = new Map<string, { label: string; count: number }>()
  // Count by tag (normalize to lowercase for deduplication, keep first seen label)
  const tagCounts = new Map<string, { label: string; count: number }>()

  for (const game of games) {
    // Category
    if (game.category) {
      const key = game.category.toLowerCase()
      const existing = categoryCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        categoryCounts.set(key, { label: game.category, count: 1 })
      }
    }

    // Tags
    if (game.tags) {
      for (const tag of game.tags) {
        if (tag.value) {
          const normalizedValue = tag.value.trim().toLowerCase()
          const existing = tagCounts.get(normalizedValue)
          if (existing) {
            existing.count++
          } else {
            tagCounts.set(normalizedValue, { label: normalizedValue, count: 1 })
          }
        }
      }
    }
  }

  // Build category options (sorted alphabetically)
  const categories: FilterOption[] = Array.from(categoryCounts.entries())
    .map(([value, { label, count }]) => ({
      value,
      label,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Build tag options (sorted alphabetically)
  const tags: FilterOption[] = Array.from(tagCounts.entries())
    .map(([value, { label, count }]) => ({
      value,
      label,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { categories, tags }
}
