import type { QuickSearchResults } from "@/hooks/use-fuzzy-search"

/** Empty search results for early returns and error states */
export const EMPTY_SEARCH_RESULTS: QuickSearchResults = {
  events: [],
  articles: [],
  games: [],
  players: [],
}
