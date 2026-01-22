import Filters from "@/components/games/filters"
import { getAllGames, getGameTags } from "@/components/games/get.action"
import GameGrid from "@/components/games/grid"

export const dynamicParams = true

export async function generateStaticParams() {
  const tags = await getGameTags()
  console.log(`[Build] Pre-generating ${tags.length} game tag pages`)
  return tags.map((tag) => ({ tag: encodeURIComponent(tag) }))
}

export default async function GameTag(props: {
  params: Promise<{ tag: string }>
}) {
  const params = await props.params
  const tag = decodeURI(params.tag)
  const games = await getAllGames(undefined, tag)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name={`Found ${games.length} games with tag "${tag}"`} />
      </div>
      <div className="pt-70">
        <GameGrid games={games} />
      </div>
    </>
  )
}
