import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { Game } from "@/models/strapi"
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
  const t = useTranslations("games")
  const hasRatings = game.ratings?.energy || game.ratings?.connection || game.ratings?.silliness
  const hasContributors =
    (game.proposedBy && game.proposedBy.length > 0) ||
    (game.documentedBy && game.documentedBy.length > 0)
  const hasResources = game.resources && game.resources.length > 0

  return (
    <aside className="game-profile-sidebar">
      {/* Game info card */}
      <div className="game-profile-sidebar__card">
        <h3 className="game-profile-sidebar__title">{t("sidebar.gameInfo")}</h3>
        <ul className="game-profile-sidebar__list">
          {/* Duration */}
          <li className="game-profile-sidebar__item">
            <i className="bx bx-time" aria-hidden="true" />
            <span className="game-profile-sidebar__label">{t("sidebar.duration")}</span>
            <span className="game-profile-sidebar__value">
              {game.timebox || t("sidebar.notSpecified")}
            </span>
          </li>

          {/* Group size */}
          <li className="game-profile-sidebar__item">
            <i className="bx bx-group" aria-hidden="true" />
            <span className="game-profile-sidebar__label">{t("sidebar.groupSize")}</span>
            <span className="game-profile-sidebar__value">{game.scale || t("sidebar.any")}</span>
          </li>

          {/* First played at */}
          {game.firstPlayedAt && (
            <li className="game-profile-sidebar__item">
              <i className="bx bx-map" aria-hidden="true" />
              <span className="game-profile-sidebar__label">{t("sidebar.firstPlayed")}</span>
              <Link
                href={`/events/${game.firstPlayedAt.slug}`}
                className="game-profile-sidebar__value game-profile-sidebar__value--link"
              >
                {game.firstPlayedAt.name}
              </Link>
            </li>
          )}

          {/* Credits */}
          {game.credits && (
            <li className="game-profile-sidebar__item">
              <i className="bx bx-award" aria-hidden="true" />
              <span className="game-profile-sidebar__label">{t("sidebar.credits")}</span>
              <span className="game-profile-sidebar__value">{game.credits}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Ratings card */}
      {hasRatings && (
        <div className="game-profile-sidebar__card">
          <h3 className="game-profile-sidebar__title">{t("sidebar.ratings")}</h3>
          <div className="game-profile-sidebar__ratings">
            {game.ratings?.energy !== undefined && (
              <Ratings name={t("sidebar.energy")} value={game.ratings.energy} />
            )}
            {game.ratings?.connection !== undefined && (
              <Ratings name={t("sidebar.connection")} value={game.ratings.connection} />
            )}
            {game.ratings?.silliness !== undefined && (
              <Ratings name={t("sidebar.silliness")} value={game.ratings.silliness} />
            )}
          </div>
        </div>
      )}

      {/* Contributors card */}
      {hasContributors && (
        <div className="game-profile-sidebar__card">
          <h3 className="game-profile-sidebar__title">{t("sidebar.contributors")}</h3>

          {/* Proposed by */}
          {game.proposedBy && game.proposedBy.length > 0 && (
            <div className="game-profile-sidebar__contributors">
              <span className="game-profile-sidebar__contributor-label">
                {t("sidebar.proposedBy")}
              </span>
              {game.proposedBy.map((player) => (
                <Link
                  key={player.slug}
                  href={`/players/${player.slug}`}
                  className="game-profile-sidebar__contributor"
                >
                  {player.avatar?.url && (
                    <Image
                      src={player.avatar.url}
                      alt={player.name || "Player avatar"}
                      width={48}
                      height={48}
                      className="game-profile-sidebar__contributor-avatar"
                      unoptimized
                    />
                  )}
                  <span className="game-profile-sidebar__contributor-name">{player.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Documented by */}
          {game.documentedBy && game.documentedBy.length > 0 && (
            <div className="game-profile-sidebar__contributors">
              <span className="game-profile-sidebar__contributor-label">
                {t("sidebar.documentedBy")}
              </span>
              {game.documentedBy.map((player) => (
                <Link
                  key={player.slug}
                  href={`/players/${player.slug}`}
                  className="game-profile-sidebar__contributor"
                >
                  {player.avatar?.url && (
                    <Image
                      src={player.avatar.url}
                      alt={player.name || "Player avatar"}
                      width={48}
                      height={48}
                      className="game-profile-sidebar__contributor-avatar"
                      unoptimized
                    />
                  )}
                  <span className="game-profile-sidebar__contributor-name">{player.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resources card */}
      {hasResources && (
        <div className="game-profile-sidebar__card">
          <h3 className="game-profile-sidebar__title">{t("sidebar.resources")}</h3>
          <ul className="game-profile-sidebar__resources">
            {game.resources?.map((r) => {
              if (!r) return null
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="game-profile-sidebar__resource"
                    aria-label={`Download ${r.name}`}
                  >
                    <i className={getFileIcon(r.ext)} aria-hidden="true" />
                    <span>{r.name}</span>
                    <i className="bx bx-download" aria-hidden="true" />
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
