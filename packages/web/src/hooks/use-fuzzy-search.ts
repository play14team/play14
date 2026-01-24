import Fuse, { type FuseResultMatch, type IFuseOptions } from "fuse.js"
import { useMemo } from "react"

export interface QuickSearchItem {
  type: "event" | "player" | "game" | "article"
  documentId: string
  slug: string
  name: string
  subtitle?: string
  imageUrl?: string
  href: string
}

export interface QuickSearchResults {
  events: QuickSearchItem[]
  players: QuickSearchItem[]
  games: QuickSearchItem[]
  articles: QuickSearchItem[]
}

export interface ScoredSearchItem extends QuickSearchItem {
  score: number
  matches?: readonly FuseResultMatch[]
}

export interface ScoredSearchResults {
  events: ScoredSearchItem[]
  players: ScoredSearchItem[]
  games: ScoredSearchItem[]
  articles: ScoredSearchItem[]
  totalCount: number
}

const fuseOptions: IFuseOptions<QuickSearchItem> = {
  threshold: 0.6,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  keys: [
    { name: "name", weight: 2.0 },
    { name: "subtitle", weight: 1.0 },
  ],
}

function scoreAndSort(items: QuickSearchItem[], query: string): ScoredSearchItem[] {
  if (items.length === 0) {
    return []
  }

  const fuse = new Fuse(items, fuseOptions)
  const results = fuse.search(query)

  return results.map((result) => ({
    ...result.item,
    score: result.score ?? 1,
    matches: result.matches,
  }))
}

/**
 * Hook that takes search results and re-scores them using Fuse.js
 * for fuzzy matching ordered by accuracy.
 */
export function useFuzzySearch(
  results: QuickSearchResults | null,
  query: string
): ScoredSearchResults | null {
  return useMemo(() => {
    // Return null if no index or query is too short
    if (!results || query.length < 2) return null

    const scoredEvents = scoreAndSort(results.events, query)
    const scoredPlayers = scoreAndSort(results.players, query)
    const scoredGames = scoreAndSort(results.games, query)
    const scoredArticles = scoreAndSort(results.articles, query)

    return {
      events: scoredEvents,
      players: scoredPlayers,
      games: scoredGames,
      articles: scoredArticles,
      totalCount:
        scoredEvents.length + scoredPlayers.length + scoredGames.length + scoredArticles.length,
    }
  }, [results, query])
}

/**
 * Highlights matched text in a string based on Fuse.js match indices.
 * Returns an array of segments with their match status.
 */
export function getHighlightSegments(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string
): Array<{ text: string; highlighted: boolean }> {
  if (!matches) {
    return [{ text, highlighted: false }]
  }

  const match = matches.find((m) => m.key === key)
  if (!match || !match.indices || match.indices.length === 0) {
    return [{ text, highlighted: false }]
  }

  const segments: Array<{ text: string; highlighted: boolean }> = []
  let lastIndex = 0

  for (const [start, end] of match.indices) {
    if (start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, start),
        highlighted: false,
      })
    }
    segments.push({
      text: text.slice(start, end + 1),
      highlighted: true,
    })
    lastIndex = end + 1
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      highlighted: false,
    })
  }

  return segments
}
