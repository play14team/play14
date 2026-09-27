import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import GameDetails from "@/components/games/details"
import { getGame, getGameSlugs } from "@/components/games/get.action"
import Page from "@/components/layout/page"
import JsonLd from "@/components/seo/json-ld"
import { pageMetadata, SITE_NAME, toDescription } from "@/libs/seo"
import type { SlugParamsProps } from "@/libs/slug-params"
import { breadcrumbJsonLd, gameJsonLd } from "@/libs/structured-data"
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
  const t = await getTranslations("games")
  const game = await getGame(props)

  if (!game) {
    return {
      title: t("gameNotFound"),
      description: t("gameNotFoundDescription"),
    }
  }

  const { slug, locale } = await props.params
  const description = toDescription(game.summary || game.description)

  return pageMetadata({
    locale,
    pathname: `/games/${slug}`,
    title: game.name,
    description,
    type: "article",
    publishedTime: game.publishedAt,
    authors: game.documentedBy?.map((p) => p.name),
    images: [game.defaultImage?.url, ...(game.images ?? []).map((i) => i?.url)],
  })
}

export default async function Game(props: SlugParamsProps) {
  const { locale } = await props.params
  const [game, t] = await Promise.all([
    getGame(props),
    getTranslations({ locale, namespace: "games" }),
  ])

  if (!game) {
    notFound()
  }

  return (
    <Page name={game.name} hideName={true}>
      <JsonLd
        data={[
          gameJsonLd(game, locale),
          breadcrumbJsonLd(locale, [
            { name: SITE_NAME, pathname: "/" },
            { name: t("title"), pathname: "/games" },
            { name: game.name },
          ]),
        ]}
      />
      <GameDetails game={game} />
    </Page>
  )
}
