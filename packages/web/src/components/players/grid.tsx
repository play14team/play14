import type { Player } from "@/models/strapi"
import PlayerCard from "./card"

const PlayerGrid = ({
  title,
  players,
}: {
  title?: string
  players: Player[]
}) => {
  return (
    <section className="scientist-area">
      <div className="container">
        {title && players.length > 0 && (
          <div className="section-title">
            <span className="sub-title">{title}</span>
          </div>
        )}
        <div className="row">
          {players?.map((player, index) => (
            <PlayerCard
              key={player.documentId || player.slug || player.name || `player-${index}`}
              player={player}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default PlayerGrid
