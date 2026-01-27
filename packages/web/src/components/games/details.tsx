import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { camelPad } from "@/libs/camelPad"
import type { Game, UploadFile } from "@/models/strapi"
import GamesNavigator from "./nav"
import GameSidebar from "./sidebar"
import GameTabs from "./tabs"

export default function GameDetails({ game }: { game: Game }) {
  const image = game.defaultImage as UploadFile
  const hasTags = game.tags && game.tags.length > 0

  return (
    <div className="game-profile">
      <div className="container">
        {/* Navigation */}
        <GamesNavigator current={game.slug} />

        {/* Hero section */}
        <div className="game-profile-hero">
          {/* Image column */}
          {image?.url && (
            <div className="game-profile-hero__image-container">
              <Image
                src={image.url}
                alt={image.name || game.name || "Game image"}
                fill
                priority
                className="game-profile-hero__image"
                sizes="(max-width: 768px) 100vw, 400px"
                unoptimized
              />
            </div>
          )}

          {/* Info column */}
          <div className="game-profile-info">
            <h1 className="game-profile-info__name">{game.name}</h1>

            {/* Meta: category, date */}
            <div className="game-profile-info__meta">
              {game.category && (
                <Link
                  href={`/games/categories/${game.category.toLowerCase()}`}
                  className="game-profile-info__meta-item"
                >
                  <i className="bx bx-folder-open" aria-hidden="true" />
                  {camelPad(game.category)}
                </Link>
              )}
              {game.publishedAt && (
                <span className="game-profile-info__meta-item">
                  <i className="bx bx-calendar" aria-hidden="true" />
                  <time dateTime={game.publishedAt}>
                    {format(parseISO(game.publishedAt), "MMM do, yyyy")}
                  </time>
                </span>
              )}
            </div>

            {/* Tags */}
            {hasTags && (
              <div className="game-profile-info__tags">
                {game.tags?.map((tag) => (
                  <Link
                    key={tag?.id}
                    href={`/games/tags/${tag?.value}`}
                    className="game-profile-info__tag"
                  >
                    <i className="bx bx-purchase-tag" aria-hidden="true" />
                    {tag?.value}
                  </Link>
                ))}
              </div>
            )}

            {/* Summary */}
            {game.summary && <p className="game-profile-info__summary">{game.summary}</p>}
          </div>
        </div>

        {/* Main content row: Content + Sidebar */}
        <div className="game-profile-content">
          {/* Main content column */}
          <div className="game-profile-main">
            <GameTabs game={game} />
          </div>

          {/* Sidebar column */}
          <GameSidebar game={game} />
        </div>
      </div>
    </div>
  )
}
