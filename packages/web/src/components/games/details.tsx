import { camelPad } from "@/libs/camelPad"
import type { Game, UploadFile } from "@/models/strapi"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import GamesNavigator from "./nav"
import GameSidebar from "./sidebar"
import GameTabs from "./tabs"

export default function GameDetails({ game }: { game: Game }) {
  const image = game.defaultImage as UploadFile
  const hasTags = game.tags && game.tags.length > 0

  return (
    <div className="services-details-area pb-100">
      <GamesNavigator current={game.slug} />
      <div className="container">
        {/* Two-column layout like player/event pages */}
        <div className="row">
          {/* Main content column */}
          <div className="col-lg-8 col-md-12">
            <div className="services-details-desc">
              {/* Hero image */}
              {image?.url && (
                <div className="game-details-hero">
                  <Image
                    src={image.url}
                    alt={image.name || game.name || "Game image"}
                    fill
                    priority
                    className="game-details-hero-image"
                    sizes="(max-width: 768px) 100vw, 66vw"
                    unoptimized
                  />
                </div>
              )}

              {/* Meta information */}
              <div className="blog-details-desc">
                <div className="article-content">
                  <div className="entry-meta">
                    <ul>
                      {game.category && (
                        <li>
                          <i className="bx bx-folder-open" aria-hidden="true" />
                          <span>Category</span>
                          <Link href={`/games/categories/${game.category.toLowerCase()}`}>
                            {camelPad(game.category)}
                          </Link>
                        </li>
                      )}
                      {game.publishedAt && (
                        <li>
                          <i className="bx bx-calendar" aria-hidden="true" />
                          <span>Published</span>
                          <time dateTime={game.publishedAt}>
                            {format(parseISO(game.publishedAt), "MMM do, yyyy")}
                          </time>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Tags */}
                {hasTags && (
                  <div className="article-footer">
                    {game.tags?.map((tag) => (
                      <div key={tag?.id} className="article-tags">
                        <span>
                          <i className="bx bx-purchase-tag" aria-hidden="true" />
                        </span>
                        <Link href={`/games/tags/${tag?.value}`}>{tag?.value}</Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {game.summary && (
                  <div className="article-footer">
                    <div className="content">
                      <h2>Summary</h2>
                      <p>{game.summary}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs section - using same wrapper as player/event pages */}
            <div className="courses-details-desc">
              <GameTabs game={game} />
            </div>
          </div>

          {/* Sidebar column */}
          <div className="col-lg-4 col-md-12">
            <GameSidebar game={game} />
          </div>
        </div>
      </div>
    </div>
  )
}
