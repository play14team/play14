import Page from "@/components/layout/page"
import PlayerDetails from "@/components/players/details"
import { getPlayerSlugs } from "@/components/players/get.action"
import { getPlayerBySlug } from "@/components/players/get.cached"
import type { SlugParamsProps } from "@/libs/slug-params"
import { notFound } from "next/navigation"

// Enable dynamic params for players not pre-generated
export const dynamicParams = true

/**
 * Pre-generate static pages for all visible players at build time.
 */
export async function generateStaticParams() {
  const response = await getPlayerSlugs()
  return response.players.map((player) => ({
    slug: player.slug,
  }))
}

export async function generateMetadata(props: SlugParamsProps) {
  const { slug } = await props.params
  const player = await getPlayerBySlug(slug)

  if (!player) {
    return {
      title: "Player Not Found",
      description: "The requested player could not be found.",
    }
  }

  return {
    title: `Players | ${player.name}`,
    description: player.bio?.substring(0, 200),
    openGraph: {
      title: player.name,
      description: player.bio?.substring(0, 200),
      type: "article",
      images: player.avatar?.url,
    },
  }
}

export default async function Player(props: SlugParamsProps) {
  const { slug } = await props.params
  const player = await getPlayerBySlug(slug)

  if (!player) {
    notFound()
  }

  return (
    <Page name={player.name}>
      <PlayerDetails player={player} />
    </Page>
  )
}
