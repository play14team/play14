import type { Game } from "@/models/strapi"
import Image from "next/image"
import Link from "next/link"
import Ratings from "../layout/ratings"

// Get file type icon based on extension
function getFileIcon(ext?: string | null): string {
  const extLower = ext?.toLowerCase().replace(".", "") || ""
  const iconMap: Record<string, string> = {
    pdf: "bxs-file-pdf",
    doc: "bxs-file-doc",
    docx: "bxs-file-doc",
    xls: "bxs-file-blank",
    xlsx: "bxs-file-blank",
    ppt: "bxs-file-blank",
    pptx: "bxs-file-blank",
    png: "bxs-file-image",
    jpg: "bxs-file-image",
    jpeg: "bxs-file-image",
    gif: "bxs-file-image",
    zip: "bxs-file-archive",
    rar: "bxs-file-archive",
  }
  return `bx ${iconMap[extLower] || "bxs-file-blank"}`
}

export default function GameSidebar({ game }: { game: Game }) {
  const hasRatings = game.ratings?.energy || game.ratings?.connection || game.ratings?.silliness

  return (
    <aside className="services-details-info" style={{ marginTop: "15px" }}>
      {/* Main info section - using same pattern as player sidebar */}
      <div className="services-contact-info" style={{ borderRadius: "10px" }}>
        <ul>
          {/* Timebox */}
          <li>
            <div className="icon">
              <i className="bx bx-time" aria-hidden="true" />
            </div>
            <span>Duration</span>
            {game.timebox || "Not specified"}
          </li>

          {/* Scale */}
          <li>
            <div className="icon">
              <i className="bx bx-group" aria-hidden="true" />
            </div>
            <span>Group size</span>
            {game.scale || "Any"}
          </li>

          {/* Ratings */}
          {hasRatings && (
            <li>
              <div className="icon">
                <i className="bx bx-star" aria-hidden="true" />
              </div>
              <span>Ratings</span>
              {game.ratings?.energy !== undefined && (
                <Ratings name="Energy" value={game.ratings.energy} />
              )}
              {game.ratings?.connection !== undefined && (
                <Ratings name="Connection" value={game.ratings.connection} />
              )}
              {game.ratings?.silliness !== undefined && (
                <Ratings name="Silliness" value={game.ratings.silliness} />
              )}
            </li>
          )}

          {/* First played at */}
          {game.firstPlayedAt && (
            <li>
              <div className="icon">
                <i className="bx bx-map" aria-hidden="true" />
              </div>
              <span>First played</span>
              <Link href={`/events/${game.firstPlayedAt.slug}`}>{game.firstPlayedAt.name}</Link>
            </li>
          )}

          {/* Credits */}
          {game.credits && (
            <li>
              <div className="icon">
                <i className="bx bx-award" aria-hidden="true" />
              </div>
              <span>Credits</span>
              {game.credits}
            </li>
          )}

          {/* Proposed by */}
          {game.proposedBy && game.proposedBy.length > 0 && (
            <li>
              <div className="icon">
                <i className="bx bx-bulb" aria-hidden="true" />
              </div>
              <span>Proposed by</span>
              {game.proposedBy.map((player) => (
                <Link
                  key={player.slug}
                  href={`/players/${player.slug}`}
                  className="centered pt-3"
                  style={{ display: "block" }}
                >
                  {player.avatar?.url && (
                    <Image
                      src={player.avatar.url}
                      alt={player.avatar.name || player.name || "Player avatar"}
                      width={200}
                      height={200}
                      priority
                      unoptimized
                      style={{
                        borderRadius: "10px",
                        width: "100%",
                        height: "auto",
                        maxWidth: "200px",
                      }}
                    />
                  )}
                  <h5 className="centered pt-2">{player.name}</h5>
                </Link>
              ))}
            </li>
          )}

          {/* Documented by */}
          {game.documentedBy && game.documentedBy.length > 0 && (
            <li>
              <div className="icon">
                <i className="bx bx-edit" aria-hidden="true" />
              </div>
              <span>Documented by</span>
              {game.documentedBy.map((player) => (
                <Link
                  key={player.slug}
                  href={`/players/${player.slug}`}
                  className="centered pt-3"
                  style={{ display: "block" }}
                >
                  {player.avatar?.url && (
                    <Image
                      src={player.avatar.url}
                      alt={player.avatar.name || player.name || "Player avatar"}
                      width={200}
                      height={200}
                      priority
                      unoptimized
                      style={{
                        borderRadius: "10px",
                        width: "100%",
                        height: "auto",
                        maxWidth: "200px",
                      }}
                    />
                  )}
                  <h5 className="centered pt-2">{player.name}</h5>
                </Link>
              ))}
            </li>
          )}
        </ul>
      </div>

      {/* Resources section - using same pattern as original */}
      {game.resources && game.resources.length > 0 && (
        <div className="download-file">
          <h3>Resources</h3>
          <ul>
            {game.resources.map((r) => {
              if (!r) return null
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${r.name}`}
                  >
                    {r.name} <i className={getFileIcon(r.ext)} aria-hidden="true" />
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
