import type { Article } from "@/models/strapi"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import Separator from "../ui/separator"
import { getArticleSidebar } from "./get.action"

/**
 * Modern sidebar component for related articles.
 * Displays latest articles, categories, and tags with improved accessibility.
 */
export default async function ArticleSidebar() {
  const response = await getArticleSidebar()

  const latest = (response.latest?.nodes || []) as Article[]
  const categories = (response.categories || []) as Article[]

  const categoryCount = categories.reduce(
    (groups, item) => {
      if (item.category) {
        groups[item.category] = (groups[item.category] || 0) + 1
      }
      return groups
    },
    {} as { [key: string]: number }
  )

  const tags = (response.tags || []) as Article[]
  const tagsCount = tags.reduce(
    (groups, item) => {
      const articleTags = item.tags
      articleTags?.forEach((tag) => {
        if (tag?.value) {
          groups[tag.value] = groups[tag.value] + 1 || 1
        }
      })
      return groups
    },
    {} as { [key: string]: number }
  )

  return (
    <aside className="article-related-sidebar" aria-label="Related articles and navigation">
      {/* Latest articles section */}
      <section className="article-related-section" aria-labelledby="latest-articles-heading">
        <h3 id="latest-articles-heading" className="article-related-section-title">
          <i className="bx bx-news" aria-hidden="true" />
          Latest articles
        </h3>

        <div className="article-related-list" role="list">
          {latest?.map((article) => (
            <article
              key={article.documentId}
              className="article-related-item"
              role="listitem"
            >
              <Link
                href={`/articles/${article.slug}`}
                className="article-related-item-link"
                aria-label={`Read article: ${article.title}`}
              >
                <div className="article-related-item-image">
                  <Image
                    src={article.defaultImage?.url || "/placeholder-article.jpg"}
                    alt=""
                    fill
                    sizes="100px"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                </div>
                <div className="article-related-item-content">
                  {article.publishedAt && (
                    <time
                      dateTime={article.publishedAt}
                      className="article-related-item-date"
                    >
                      {format(parseISO(article.publishedAt), "MMM do, yyyy")}
                    </time>
                  )}
                  <h4 className="article-related-item-title">{article.title}</h4>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <Separator className="article-related-separator" />

      {/* Categories section */}
      {Object.keys(categoryCount).length > 0 && (
        <>
          <section
            className="article-related-section"
            aria-labelledby="categories-heading"
          >
            <h3 id="categories-heading" className="article-related-section-title">
              <i className="bx bx-folder" aria-hidden="true" />
              Categories
            </h3>

            <ul className="article-related-categories" role="list">
              {Object.entries(categoryCount).map(([category, count]) => (
                <li key={category} role="listitem">
                  <Link
                    href={`/articles/categories/${category.toLowerCase()}`}
                    className="article-related-category-link"
                  >
                    <span className="article-related-category-name">{category}</span>
                    <span
                      className="article-related-category-count"
                      aria-label={`${count} articles`}
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <Separator className="article-related-separator" />
        </>
      )}

      {/* Tags section */}
      {Object.keys(tagsCount).length > 0 && (
        <section className="article-related-section" aria-labelledby="tags-heading">
          <h3 id="tags-heading" className="article-related-section-title">
            <i className="bx bx-purchase-tag" aria-hidden="true" />
            Popular tags
          </h3>

          <div className="article-related-tags" role="list" aria-label="Article tags">
            {Object.entries(tagsCount).map(([tag, count]) => (
              <Link
                key={tag}
                href={`/articles/tags/${tag}`}
                className="article-related-tag"
                role="listitem"
                aria-label={`${tag} (${count} articles)`}
              >
                {tag}
                <span className="article-related-tag-count">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}
