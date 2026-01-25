"use server"

import type { FilterOption } from "@/components/filters"
import { restQuery } from "@/libs/strapi-client"

interface ArticleFilterData {
  category?: string
  tags?: Array<{ value: string }>
}

/**
 * Get all filter options for the articles page
 *
 * Returns categories and tags with counts
 */
export async function getArticleFilterOptions(): Promise<{
  categories: FilterOption[]
  tags: FilterOption[]
}> {
  // Fetch ALL articles with minimal data for counting
  // Strapi limits to 100 per page, so we need to paginate
  const allArticles: ArticleFilterData[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await restQuery<ArticleFilterData[]>("articles", {
      fields: ["category"],
      populate: { tags: { fields: ["value"] } },
      pagination: { page, pageSize },
    })

    const articles = response.data || []
    allArticles.push(...articles)

    if (articles.length < pageSize) {
      break
    }
    page++
  }

  const articles = allArticles

  // Count by category (normalize to lowercase for deduplication, keep first seen label)
  const categoryCounts = new Map<string, { label: string; count: number }>()
  // Count by tag (normalize to lowercase for deduplication, keep first seen label)
  const tagCounts = new Map<string, { label: string; count: number }>()

  for (const article of articles) {
    // Category
    if (article.category) {
      const key = article.category.toLowerCase()
      const existing = categoryCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        categoryCounts.set(key, { label: article.category, count: 1 })
      }
    }

    // Tags
    if (article.tags) {
      for (const tag of article.tags) {
        if (tag.value) {
          const normalizedValue = tag.value.trim().toLowerCase()
          const existing = tagCounts.get(normalizedValue)
          if (existing) {
            existing.count++
          } else {
            tagCounts.set(normalizedValue, { label: normalizedValue, count: 1 })
          }
        }
      }
    }
  }

  // Build category options (sorted alphabetically)
  const categories: FilterOption[] = Array.from(categoryCounts.entries())
    .map(([value, { label, count }]) => ({
      value,
      label,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Build tag options (sorted alphabetically)
  const tags: FilterOption[] = Array.from(tagCounts.entries())
    .map(([value, { label, count }]) => ({
      value,
      label,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { categories, tags }
}
