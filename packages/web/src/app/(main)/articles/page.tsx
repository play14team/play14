import type { Metadata } from "next"
import ArticlesPageContent from "@/components/articles/articles-page-content"
import { getAllArticles } from "@/components/articles/get.action"
import { getArticleFilterOptions } from "@/components/articles/get-filter-options.action"
import type { Article } from "@/models/strapi"

export const metadata: Metadata = {
  title: "Articles",
}

// Force static generation - filtering happens client-side
export const dynamic = "force-static"
export const revalidate = 3600

/**
 * Articles page with pure client-side filtering
 *
 * - Page is statically generated with ALL articles at build time
 * - Filter options are pre-fetched at build time
 * - Filtering happens entirely client-side (instant, no loading)
 * - URL params are used for shareable filter states
 */
export default async function Articles() {
  // Fetch ALL articles and filter options in parallel at build time
  const [filterOptions, articles] = await Promise.all([
    getArticleFilterOptions(),
    getAllArticles(), // Fetches all pages (Strapi limits to 100 per page)
  ])

  return (
    <ArticlesPageContent initialArticles={articles as Article[]} filterOptions={filterOptions} />
  )
}
