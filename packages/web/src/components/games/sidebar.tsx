import type { Game } from "@/models/strapi"
import Image from "next/image"
import Link from "next/link"
import Ratings from "../layout/ratings"

const GameSidebar = (props: { game: Game }) => {
  const { game } = props

  return (
    <aside className="services-details-info" style={{ marginTop: "15px" }}>
      <div className="services-contact-info" style={{ borderRadius: "10px" }}>
        <ul>
          <li>
            <div className="icon">
              <i className="bx bx-time" />
            </div>
            <span>Timebox</span>
            {game.timebox}
          </li>
          <li>
            <div className="icon">
              <i className="bx bx-user-circle" />
            </div>
            <span>Scale</span>
            {game.scale}
          </li>

          {game.ratings?.energy && (
            <li>
              <div className="icon">
                <i className="bx bx-star" />
              </div>
              <span>Ratings</span>
              {game.ratings.energy !== undefined && (
                <Ratings name="Energy" value={game.ratings.energy} />
              )}
              {game.ratings.connection !== undefined && (
                <Ratings name="Connection" value={game.ratings.connection} />
              )}
              {game.ratings.silliness !== undefined && (
                <Ratings name="Silliness" value={game.ratings.silliness} />
              )}
            </li>
          )}

          {game.firstPlayedAt && (
            <li>
              <div className="icon">
                <i className="bx bx-map" />
              </div>
              <span>First played</span>
              <Link href={`/events/${game.firstPlayedAt?.slug}`}>{game.firstPlayedAt.name}</Link>
            </li>
          )}

          {game.credits && (
            <li>
              <div className="icon">
                <i className="bx bx-award" />
              </div>
              <span>Credits</span>
              {game.credits}
            </li>
          )}

          {game.proposedBy && game.proposedBy.length > 0 && (
            <li>
              <div className="icon">
                <i className="bx bx-bulb" />
              </div>
              <span>Proposed by</span>
              {game.proposedBy.map((player) => (
                <Link key={player.slug} href={`/players/${player.slug}`} className="centered pt-3">
                  {player.avatar?.url && (
                    <Image
                      src={player.avatar.url}
                      alt={player.avatar.name || player.name || "Player avatar"}
                      width={200}
                      height={200}
                      priority
                      unoptimized
                    />
                  )}
                  <h5 className="centered pt-2">{player.name}</h5>
                </Link>
              ))}
            </li>
          )}

          {game.documentedBy && game.documentedBy.length > 0 && (
            <li>
              <div className="icon">
                <i className="bx bx-edit" />
              </div>
              <span>Documented by</span>
              {game.documentedBy.map((player) => (
                <Link key={player.slug} href={`/players/${player.slug}`} className="centered pt-3">
                  {player.avatar?.url && (
                    <Image
                      src={player.avatar.url}
                      alt={player.avatar.name || player.name || "Player avatar"}
                      width={200}
                      height={200}
                      priority
                      unoptimized
                    />
                  )}
                  <h5 className="centered pt-2">{player.name}</h5>
                </Link>
              ))}
            </li>
          )}
        </ul>
      </div>

      {game.resources && game.resources.length > 0 && (
        <div className="download-file">
          <h3>Resources</h3>

          <ul>
            {game.resources?.map((r) => {
              if (!r) return null
              const icon = `bx bxs-file-${r.ext}`
              return (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.name} <i className={icon} />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </aside>
  )
}

export default GameSidebar
