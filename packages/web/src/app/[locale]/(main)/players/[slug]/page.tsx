import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import PlayerDetails from "@/components/players/details"
import { getPlayerSlugs } from "@/components/players/get.action"
import { getPlayerBySlug } from "@/components/players/get.cached"
import type { SlugParamsProps } from "@/libs/slug-params"

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
  const [player, t] = await Promise.all([getPlayerBySlug(slug), getTranslations("players")])

  if (!player) {
    return {
      title: t("playerNotFound"),
      description: t("playerNotFoundDescription"),
    }
  }

  return {
    title: `${t("title")} | ${player.name}`,
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

  return <PlayerDetails player={player} />
}
