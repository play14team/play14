import { notFound } from "next/navigation"
import GameDetails from "@/components/games/details"
import { getGame, getGameSlugs } from "@/components/games/get.action"
import Page from "@/components/layout/page"
import type { SlugParamsProps } from "@/libs/slug-params"
import type { Game } from "@/models/strapi"

// Enable dynamic params for games not pre-generated
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const response = (await getGameSlugs()) as {
      games?: Game[]
    }
    const games = response?.games || []
    console.log(`[Build] Pre-generating ${games.length} game pages`)

    return games.map((game) => ({
      slug: game.slug,
    }))
  } catch (error) {
    console.warn(
      "[Build] Failed to generate static params for games:",
      error instanceof Error ? error.message : String(error)
    )
    console.warn("[Build] Games will be generated on-demand at runtime")
    return []
  }
}

export async function generateMetadata(props: SlugParamsProps) {
  const game = await getGame(props)

  if (!game) {
    return {
      title: "Game Not Found",
      description: "The requested game could not be found.",
    }
  }

  const images = game.images?.filter(Boolean)?.map((i) => (i as { url: string }).url) as string[]

  return {
    title: `Games | ${game.name}`,
    description: game.summary,
    openGraph: {
      title: game.name,
      description: game.summary,
      type: "article",
      publishedTime: game.publishedAt,
      authors: game.documentedBy?.length ? game.documentedBy.map((p) => p.name) : undefined,
      images: [game.defaultImage?.url].concat(images),
    },
  }
}

export default async function Game(props: SlugParamsProps) {
  const game = await getGame(props)

  if (!game) {
    notFound()
  }

  return (
    <Page name={game.name} hideName={true}>
      <GameDetails game={game} />
    </Page>
  )
}
