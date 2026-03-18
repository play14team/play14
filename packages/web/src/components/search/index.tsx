import { getTranslations } from "next-intl/server"
import ArticleGrid from "@/components/articles/grid"
import EventGrid from "@/components/events/grid"
import GameGrid from "@/components/games/grid"
import PlayerGrid from "@/components/players/grid"
import { search } from "./get.action"

export default async function Search({ input }: { input: string | undefined }) {
  if (!input) return

  const [{ events, players, articles, games }, t] = await Promise.all([
    search(input),
    getTranslations("search"),
  ])

  return (
    <div className="pt-70">
      {events && events.length > 0 && (
        <div>
          <div className="d-flex justify-content-between">
            <h3>{t("events")}</h3>
            <p>{t("found", { count: events.length })}</p>
          </div>
          <EventGrid events={events} />
        </div>
      )}
      {players && players.length > 0 && (
        <div>
          <div className="d-flex justify-content-between pb-70">
            <h3>{t("players")}</h3>
            <p>{t("found", { count: players.length })}</p>
          </div>
          <PlayerGrid players={players} />
        </div>
      )}
      {games && games.length > 0 && (
        <div>
          <div className="d-flex justify-content-between">
            <h3>{t("games")}</h3>
            <p>{t("found", { count: games.length })}</p>
          </div>
          <GameGrid games={games} />
        </div>
      )}
      {articles && articles.length > 0 && (
        <div>
          <div className="d-flex justify-content-between">
            <h3>{t("articles")}</h3>
            <p>{t("found", { count: articles.length })}</p>
          </div>
          <ArticleGrid articles={articles} />
        </div>
      )}
      {events.length === 0 &&
        players.length === 0 &&
        games.length === 0 &&
        articles.length === 0 && <h5 className="pb-70">{t("noResults")}</h5>}
    </div>
  )
}
