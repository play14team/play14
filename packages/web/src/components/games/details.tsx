import { camelPad } from "@/libs/camelPad"
import type { Game, UploadFile } from "@/models/strapi"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import Separator from "../ui/separator"
import GamesNavigator from "./nav"
import GameSidebar from "./sidebar"
import GameTabs from "./tabs"

export default function GameDetails({ game }: { game: Game }) {
  const image = game.defaultImage as UploadFile
  const hasTags = game.tags && game.tags.length > 0

  return (
    <article className="game-details" aria-labelledby="game-title">
      <GamesNavigator current={game.slug} />

      <div className="container">
        {/* Hero image */}
        {image?.url && (
          <div className="game-details-hero">
            <Image
              src={image.url}
              alt={image.name || game.name || "Game image"}
              fill
              priority
              className="game-details-hero-image"
              sizes="100vw"
              unoptimized
            />
          </div>
        )}

        {/* Header section */}
        <header className="game-details-header">
          <h1 id="game-title">{game.name}</h1>

          {/* Meta information */}
          <div className="game-details-meta" role="list" aria-label="Game metadata">
            {game.category && (
              <div className="game-details-meta-item" role="listitem">
                <i className="bx bx-folder-open" aria-hidden="true" />
                <Link href={`/games/categories/${game.category.toLowerCase()}`}>
                  {camelPad(game.category)}
                </Link>
              </div>
            )}
            {game.publishedAt && (
              <div className="game-details-meta-item" role="listitem">
                <i className="bx bx-calendar" aria-hidden="true" />
                <time dateTime={game.publishedAt}>
                  {format(parseISO(game.publishedAt), "MMM do, yyyy")}
                </time>
              </div>
            )}
          </div>

          {/* Tags */}
          {hasTags && (
            <nav className="game-details-tags" aria-label="Game tags">
              {game.tags?.map((tag) => (
                <Link key={tag?.id} href={`/games/tags/${tag?.value}`} className="game-details-tag">
                  <i className="bx bx-purchase-tag" aria-hidden="true" />
                  {tag?.value}
                </Link>
              ))}
            </nav>
          )}
        </header>

        {/* Main content area */}
        <div className="game-details-content">
          {/* Left column - Main content */}
          <main className="game-details-main">
            {/* Summary */}
            {game.summary && (
              <>
                <p className="game-details-summary">{game.summary}</p>
                <Separator />
              </>
            )}

            {/* Tabbed content */}
            <GameTabs game={game} />
          </main>

          {/* Right column - Sidebar */}
          <GameSidebar game={game} />
        </div>
      </div>
    </article>
  )
}
