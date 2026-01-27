import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import type { Article } from "@/models/strapi"
import { getArticleSidebar } from "./get.action"

/**
 * Sidebar component for related articles.
 * Uses consistent styling with other sidebars in the application.
 * Displays latest articles, categories, and tags.
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
    <aside className="widget-area" aria-label="Related articles and navigation">
      {/* Latest articles section */}
      <section className="widget widget_recent_entries" aria-labelledby="latest-articles-heading">
        <h3 id="latest-articles-heading" className="widget-title">
          Latest articles
        </h3>

        <ul className="recent-posts-list">
          {latest?.map((article) => (
            <li key={article.documentId}>
              <Link
                href={`/articles/${article.slug}`}
                aria-label={`Read article: ${article.title}`}
              >
                <div className="recent-post-thumb">
                  <Image
                    src={article.defaultImage?.url || "/placeholder-article.jpg"}
                    alt=""
                    width={80}
                    height={80}
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                </div>
                <div className="recent-post-content">
                  {article.publishedAt && (
                    <time dateTime={article.publishedAt} className="recent-post-date">
                      <i className="bx bx-calendar" aria-hidden="true" />
                      {format(parseISO(article.publishedAt), "MMM do, yyyy")}
                    </time>
                  )}
                  <h4>{article.title}</h4>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories section */}
      {Object.keys(categoryCount).length > 0 && (
        <section className="widget widget_categories" aria-labelledby="categories-heading">
          <h3 id="categories-heading" className="widget-title">
            Categories
          </h3>

          <ul role="list">
            {Object.entries(categoryCount).map(([category, count]) => (
              <li key={category}>
                <Link href={`/articles/categories/${category.toLowerCase()}`}>
                  {category}
                  <span className="post-count" aria-label={`${count} articles`}>
                    ({count})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tags section */}
      {Object.keys(tagsCount).length > 0 && (
        <section className="widget widget_tag_cloud" aria-labelledby="sidebar-tags-heading">
          <h3 id="sidebar-tags-heading" className="widget-title">
            Popular tags
          </h3>

          <div className="tagcloud" role="list" aria-label="Article tags">
            {Object.entries(tagsCount).map(([tag]) => (
              <Link key={tag} href={`/articles/tags/${tag}`} role="listitem">
                {tag}
              </Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}
