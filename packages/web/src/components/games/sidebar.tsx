import type { Game } from "@/models/strapi"
import Image from "next/image"
import Link from "next/link"
import Avatar from "../ui/avatar"

// Rating stars component
function RatingStars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="rating-stars" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={`fa fa-star ${i < value ? "active" : ""}`} aria-hidden="true" />
      ))}
    </div>
  )
}

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
  const hasContributors =
    (game.proposedBy && game.proposedBy.length > 0) ||
    (game.documentedBy && game.documentedBy.length > 0)
  const hasResources = game.resources && game.resources.length > 0

  return (
    <aside className="game-details-sidebar" aria-label="Game information">
      {/* Game info card */}
      <div className="game-details-sidebar-card">
        <h2 className="game-details-sidebar-title">Game info</h2>
        <ul className="game-details-info-list">
          {/* Timebox */}
          <li className="game-details-info-item">
            <div className="icon">
              <i className="bx bx-time" aria-hidden="true" />
            </div>
            <div className="content">
              <span className="label">Duration</span>
              <span className="value">{game.timebox || "Not specified"}</span>
            </div>
          </li>

          {/* Scale */}
          <li className="game-details-info-item">
            <div className="icon">
              <i className="bx bx-group" aria-hidden="true" />
            </div>
            <div className="content">
              <span className="label">Group size</span>
              <span className="value">{game.scale || "Any"}</span>
            </div>
          </li>

          {/* First played at */}
          {game.firstPlayedAt && (
            <li className="game-details-info-item">
              <div className="icon">
                <i className="bx bx-calendar-event" aria-hidden="true" />
              </div>
              <div className="content">
                <span className="label">First played at</span>
                <span className="value">
                  <Link href={`/events/${game.firstPlayedAt.slug}`}>{game.firstPlayedAt.name}</Link>
                </span>
              </div>
            </li>
          )}

          {/* Credits */}
          {game.credits && (
            <li className="game-details-info-item">
              <div className="icon">
                <i className="bx bx-award" aria-hidden="true" />
              </div>
              <div className="content">
                <span className="label">Credits</span>
                <span className="value">{game.credits}</span>
              </div>
            </li>
          )}
        </ul>

        {/* Ratings */}
        {hasRatings && (
          <div className="game-details-ratings">
            <h3 className="game-details-sidebar-title" style={{ marginTop: "16px" }}>
              Ratings
            </h3>
            {game.ratings?.energy !== undefined && (
              <div className="game-details-rating">
                <span>Energy</span>
                <RatingStars value={game.ratings.energy} />
              </div>
            )}
            {game.ratings?.connection !== undefined && (
              <div className="game-details-rating">
                <span>Connection</span>
                <RatingStars value={game.ratings.connection} />
              </div>
            )}
            {game.ratings?.silliness !== undefined && (
              <div className="game-details-rating">
                <span>Silliness</span>
                <RatingStars value={game.ratings.silliness} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contributors card */}
      {hasContributors && (
        <div className="game-details-sidebar-card">
          <h2 className="game-details-sidebar-title">Contributors</h2>

          {/* Proposed by */}
          {game.proposedBy && game.proposedBy.length > 0 && (
            <>
              <span
                className="label"
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Proposed by
              </span>
              <div className="game-details-contributors">
                {game.proposedBy.map((player) => (
                  <Link
                    key={player.slug}
                    href={`/players/${player.slug}`}
                    className="game-details-contributor"
                  >
                    {player.avatar?.url ? (
                      <Image
                        src={player.avatar.url}
                        alt={player.name || "Player avatar"}
                        width={48}
                        height={48}
                        className="avatar"
                        unoptimized
                      />
                    ) : (
                      <Avatar fallback={player.name || ""} size="lg" />
                    )}
                    <span className="name">{player.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Documented by */}
          {game.documentedBy && game.documentedBy.length > 0 && (
            <>
              <span
                className="label"
                style={{
                  display: "block",
                  marginBottom: "12px",
                  marginTop: "16px",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Documented by
              </span>
              <div className="game-details-contributors">
                {game.documentedBy.map((player) => (
                  <Link
                    key={player.slug}
                    href={`/players/${player.slug}`}
                    className="game-details-contributor"
                  >
                    {player.avatar?.url ? (
                      <Image
                        src={player.avatar.url}
                        alt={player.name || "Player avatar"}
                        width={48}
                        height={48}
                        className="avatar"
                        unoptimized
                      />
                    ) : (
                      <Avatar fallback={player.name || ""} size="lg" />
                    )}
                    <span className="name">{player.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Resources card */}
      {hasResources && (
        <div className="game-details-sidebar-card">
          <h2 className="game-details-sidebar-title">Resources</h2>
          <div className="game-details-resources">
            {game.resources?.map((r) => {
              if (!r) return null
              return (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="game-details-resource"
                  aria-label={`Download ${r.name}`}
                >
                  <i className={getFileIcon(r.ext)} aria-hidden="true" />
                  <span className="name">{r.name}</span>
                  <i className="bx bx-download download-icon" aria-hidden="true" />
                </a>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
