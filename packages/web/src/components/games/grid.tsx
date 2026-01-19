import type { Game } from "@/models/strapi"
import GameCard from "./card"

const GameGrid = ({ games }: { games: Game[] }) => {
  return (
    <div className="courses-area">
      <div className="container">
        <div className="row">
          {games?.map((game) => (
            <GameCard key={game.documentId} game={game} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default GameGrid
