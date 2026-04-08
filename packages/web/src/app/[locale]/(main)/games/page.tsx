import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import GamesPageContent from "@/components/games/games-page-content"
import { getAllGames } from "@/components/games/get.action"
import { getGameFilterOptions } from "@/components/games/get-filter-options.action"
import type { Game } from "@/models/strapi"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("games")
  return {
    title: t("title"),
  }
}

// Force static generation - filtering happens client-side
export const dynamic = "force-static"
export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Games page with pure client-side filtering
 *
 * - Page is statically generated with ALL games at build time
 * - Filter options are pre-fetched at build time
 * - Filtering happens entirely client-side (instant, no loading)
 * - URL params are used for shareable filter states
 */
export default async function Games({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Fetch ALL games and filter options in parallel at build time
  const [filterOptions, games] = await Promise.all([
    getGameFilterOptions(),
    getAllGames(), // Fetches all pages (Strapi limits to 100 per page)
  ])

  return <GamesPageContent initialGames={games as Game[]} filterOptions={filterOptions} />
}
