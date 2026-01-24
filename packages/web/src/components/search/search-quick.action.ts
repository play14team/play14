"use server"

import type { QuickSearchItem, QuickSearchResults } from "@/hooks/use-fuzzy-search"
import { restQuery } from "@/libs/strapi-client"
import {
  searchArticlePopulate,
  searchEventPopulate,
  searchGamePopulate,
  searchPlayerPopulate,
} from "@/libs/strapi-populate"

interface UploadFile {
  name: string
  url: string
  width?: number
  height?: number
}

interface Event {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  timezone?: string
  eventStatus: string
  defaultImage?: UploadFile
  location?: {
    name: string
    country: string
  }
}

interface Article {
  documentId: string
  slug: string
  title: string
  category?: string
  summary?: string
  publishedAt?: string
  defaultImage?: UploadFile
  author?: {
    name: string
    slug: string
    avatar?: UploadFile
  }
}

interface Game {
  documentId: string
  slug: string
  name: string
  category?: string
  summary?: string
  defaultImage?: UploadFile
  proposedBy?: Array<{
    name: string
    slug: string
    avatar?: UploadFile
  }>
}

interface Player {
  documentId: string
  slug: string
  name: string
  position?: string
  avatar?: UploadFile
}

const QUICK_SEARCH_LIMIT = 10
const SEARCH_INDEX_LIMIT = 500

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
        documentId: e.documentId,
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
        documentId: a.documentId,
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
        documentId: g.documentId,
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
        documentId: p.documentId,
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
  const [eventsRes, articlesRes, gamesRes, playersRes] = await Promise.all([
    restQuery<Event[]>("events", {
      filters: {
        $or: [
          { name: { $containsi: input } },
          { description: { $containsi: input } },
          { location: { name: { $containsi: input } } },
        ],
      },
      sort: ["name:asc"],
      pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
      populate: searchEventPopulate,
    }),
    restQuery<Article[]>("articles", {
      filters: {
        $or: [
          { title: { $containsi: input } },
          { summary: { $containsi: input } },
          { content: { $containsi: input } },
        ],
      },
      sort: ["publishedAt:desc"],
      pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
      populate: searchArticlePopulate,
    }),
    restQuery<Game[]>("games", {
      filters: {
        $or: [
          { name: { $containsi: input } },
          { summary: { $containsi: input } },
          { description: { $containsi: input } },
        ],
      },
      sort: ["name:asc"],
      pagination: { page: 1, pageSize: QUICK_SEARCH_LIMIT },
      populate: searchGamePopulate,
    }),
    restQuery<Player[]>("players", {
      filters: {
        $or: [{ name: { $containsi: input } }, { bio: { $containsi: input } }],
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
        documentId: e.documentId,
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
        documentId: a.documentId,
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
        documentId: g.documentId,
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
        documentId: p.documentId,
        slug: p.slug,
        name: p.name,
        subtitle: p.position,
        imageUrl: p.avatar?.url,
        href: `/players/${p.slug}`,
      })
    ),
  }
}
