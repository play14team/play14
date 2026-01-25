"use server"

import type { QuickSearchItem, QuickSearchResults } from "@/hooks/use-fuzzy-search"
import { restQuery } from "@/libs/strapi-client"
import {
  searchArticlePopulate,
  searchEventPopulate,
  searchGamePopulate,
  searchPlayerPopulate,
} from "@/libs/strapi-populate"
import type { Article, Event, Game, Player } from "@/models/strapi"

const QUICK_SEARCH_LIMIT = 10
const SEARCH_INDEX_LIMIT = 500

/** Empty search results for early returns and error states */
export const EMPTY_SEARCH_RESULTS: QuickSearchResults = {
  events: [],
  articles: [],
  games: [],
  players: [],
}

/**
 * Fetches the full search index for client-side fuzzy matching.
 * This enables typo tolerance since Fuse.js handles all the matching.
 * Called once when the search dialog opens, then cached on the client.
 */
export async function fetchSearchIndex(): Promise<QuickSearchResults> {
  const [eventsRes, articlesRes, gamesRes, playersRes] = await Promise.all([
    restQuery<Event[]>("events", {
      sort: ["start:desc"],
      pagination: { page: 1, pageSize: SEARCH_INDEX_LIMIT },
      populate: searchEventPopulate,
    }),
    restQuery<Article[]>("articles", {
      sort: ["publishedAt:desc"],
      pagination: { page: 1, pageSize: SEARCH_INDEX_LIMIT },
      populate: searchArticlePopulate,
    }),
    restQuery<Game[]>("games", {
      sort: ["name:asc"],
      pagination: { page: 1, pageSize: SEARCH_INDEX_LIMIT },
      populate: searchGamePopulate,
    }),
    restQuery<Player[]>("players", {
      sort: ["name:asc"],
      pagination: { page: 1, pageSize: SEARCH_INDEX_LIMIT },
      populate: searchPlayerPopulate,
    }),
  ])

  return {
    events: (eventsRes.data || []).map(
      (e): QuickSearchItem => ({
        type: "event",
        documentId: e.documentId ?? e.slug,
        slug: e.slug,
        name: e.name,
        subtitle: e.location?.name,
        imageUrl: e.defaultImage?.url,
        href: `/events/${e.slug}`,
      })
    ),
    articles: (articlesRes.data || []).map(
      (a): QuickSearchItem => ({
        type: "article",
        documentId: a.documentId ?? a.slug,
        slug: a.slug,
        name: a.title,
        subtitle: a.author?.name,
        imageUrl: a.defaultImage?.url,
        href: `/articles/${a.slug}`,
      })
    ),
    games: (gamesRes.data || []).map(
      (g): QuickSearchItem => ({
        type: "game",
        documentId: g.documentId ?? g.slug,
        slug: g.slug,
        name: g.name,
        subtitle: g.category,
        imageUrl: g.defaultImage?.url,
        href: `/games/${g.slug}`,
      })
    ),
    players: (playersRes.data || []).map(
      (p): QuickSearchItem => ({
        type: "player",
        documentId: p.documentId ?? p.slug,
        slug: p.slug,
        name: p.name,
        subtitle: p.position,
        imageUrl: p.avatar?.url,
        href: `/players/${p.slug}`,
      })
    ),
  }
}

/**
 * Lightweight search action for the quick search command palette.
 * Returns up to 10 results per type with normalized format.
 * Results are filtered server-side and then re-scored client-side with Fuse.js.
 */
export async function searchQuick(input: string): Promise<QuickSearchResults> {
  // Security: Validate input to prevent abuse and reduce attack surface
  // - Minimum 2 chars: prevents single-char noise queries and expensive wildcard searches
  // - Maximum 100 chars: protects against injection attempts and oversized payloads
  // Returns empty results silently to avoid exposing validation logic to clients
  if (!input || typeof input !== "string") {
    console.warn("[searchQuick] Invalid input: empty or non-string", { inputType: typeof input })
    return EMPTY_SEARCH_RESULTS
  }

  const trimmedInput = input.trim()

  if (trimmedInput.length < 2) {
    // Expected UI behavior, don't log
    return EMPTY_SEARCH_RESULTS
  }

  if (trimmedInput.length > 100) {
    console.warn("[searchQuick] Input exceeds maximum length", {
      length: trimmedInput.length,
      maxLength: 100,
      truncated: `${trimmedInput.substring(0, 20)}...`,
    })
    return EMPTY_SEARCH_RESULTS
  }

  try {
    const [eventsRes, articlesRes, gamesRes, playersRes] = await Promise.all([
      restQuery<Event[]>("events", {
        filters: {
          $or: [
            { name: { $containsi: trimmedInput } },
            { description: { $containsi: trimmedInput } },
            { location: { name: { $containsi: trimmedInput } } },
          ],
        },
        sort: ["name:asc"],
        pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
        populate: searchEventPopulate,
      }),
      restQuery<Article[]>("articles", {
        filters: {
          $or: [
            { title: { $containsi: trimmedInput } },
            { summary: { $containsi: trimmedInput } },
            { content: { $containsi: trimmedInput } },
          ],
        },
        sort: ["publishedAt:desc"],
        pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
        populate: searchArticlePopulate,
      }),
      restQuery<Game[]>("games", {
        filters: {
          $or: [
            { name: { $containsi: trimmedInput } },
            { summary: { $containsi: trimmedInput } },
            { description: { $containsi: trimmedInput } },
          ],
        },
        sort: ["name:asc"],
        pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
        populate: searchGamePopulate,
      }),
      restQuery<Player[]>("players", {
        filters: {
          $or: [{ name: { $containsi: trimmedInput } }, { bio: { $containsi: trimmedInput } }],
        },
        sort: ["name:asc"],
        pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
        populate: searchPlayerPopulate,
      }),
    ])

    return {
      events: (eventsRes.data || []).map(
        (e): QuickSearchItem => ({
          type: "event",
          documentId: e.documentId ?? e.slug,
          slug: e.slug,
          name: e.name,
          subtitle: e.location?.name,
          imageUrl: e.defaultImage?.url,
          href: `/events/${e.slug}`,
        })
      ),
      articles: (articlesRes.data || []).map(
        (a): QuickSearchItem => ({
          type: "article",
          documentId: a.documentId ?? a.slug,
          slug: a.slug,
          name: a.title,
          subtitle: a.author?.name,
          imageUrl: a.defaultImage?.url,
          href: `/articles/${a.slug}`,
        })
      ),
      games: (gamesRes.data || []).map(
        (g): QuickSearchItem => ({
          type: "game",
          documentId: g.documentId ?? g.slug,
          slug: g.slug,
          name: g.name,
          subtitle: g.category,
          imageUrl: g.defaultImage?.url,
          href: `/games/${g.slug}`,
        })
      ),
      players: (playersRes.data || []).map(
        (p): QuickSearchItem => ({
          type: "player",
          documentId: p.documentId ?? p.slug,
          slug: p.slug,
          name: p.name,
          subtitle: p.position,
          imageUrl: p.avatar?.url,
          href: `/players/${p.slug}`,
        })
      ),
    }
  } catch (error) {
    console.error("[searchQuick] API request failed:", {
      query: trimmedInput,
      queryLength: trimmedInput.length,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Re-throw to let caller (SearchCommand) handle user feedback
    throw error
  }
}
