import Filters from "@/components/games/filters"
import { getAllGames, getGameCategories } from "@/components/games/get.action"
import GameGrid from "@/components/games/grid"
import { camelPad } from "@/libs/camelPad"

export const dynamicParams = true

export async function generateStaticParams() {
  const categories = await getGameCategories()
  console.log(`[Build] Pre-generating ${categories.length} game category pages`)
  return categories.map((category) => ({ category }))
}

export default async function GameCategory(props: {
  params: Promise<{ category: string }>
}) {
  const params = await props.params
  const games = await getAllGames(params.category)

  const cat =
    games.length > 0 ? camelPad(games[0].category ?? params.category) : camelPad(params.category)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name={`Found ${games.length} games with category "${cat}"`} />
      </div>
      <div className="pt-70">
        <GameGrid games={games} />
      </div>
    </>
  )
}
