import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getAllPlayers } from "@/components/players/get.action"
import { getPlayerFilterOptions } from "@/components/players/get-filter-options.action"
import PlayersPageContent from "@/components/players/players-page-content"
import type { Player } from "@/models/strapi"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("players")
  return {
    title: t("title"),
  }
}

// Force static generation - filtering happens client-side
export const dynamic = "force-static"
export const revalidate = 3600

/**
 * Players page with pure client-side filtering
 *
 * - Page is statically generated with ALL players at build time
 * - Filter options are pre-fetched at build time
 * - Filtering happens entirely client-side (instant, no loading)
 * - URL params are used for shareable filter states
 */
export default async function Players() {
  // Fetch ALL players and filter options in parallel at build time
  const [filterOptions, players] = await Promise.all([
    getPlayerFilterOptions(),
    getAllPlayers(), // Fetches all pages (Strapi limits to 100 per page)
  ])

  return <PlayersPageContent initialPlayers={players as Player[]} filterOptions={filterOptions} />
}
