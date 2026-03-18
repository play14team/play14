import { format, parseISO } from "date-fns"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import type { Article } from "@/models/strapi"
import { getArticleSidebar } from "./get.action"

/**
 * Modern related articles section displayed at the bottom of article pages.
 * Features:
 * - Horizontal 3-card grid layout (responsive: 3 → 2 → 1)
 * - Card-based design with images, titles, and metadata
 * - Modern hover effects and styling
 */
export default async function RelatedSection() {
  const t = await getTranslations("articles")
  const response = await getArticleSidebar()

  const latest = (response.latest?.nodes || []) as Article[]

  // Take top 3 latest articles for the grid
  const featuredArticles = latest.slice(0, 3)

  if (!featuredArticles.length) {
    return (
      <section className="article-profile-related" aria-labelledby="related-heading">
        <header className="article-profile-related__header">
          <h2 id="related-heading" className="article-profile-related__title">
            <i className="bx bx-news" />
            {t("latestArticles")}
          </h2>
        </header>
        <div className="article-profile-related__empty">
          <i className="bx bx-file" />
          <p>{t("noArticles")}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="article-profile-related" aria-labelledby="related-heading">
      {/* Header */}
      <header className="article-profile-related__header">
        <h2 id="related-heading" className="article-profile-related__title">
          <i className="bx bx-news" />
          {t("latestArticles")}
        </h2>
        <Link href="/articles" className="article-profile-related__link">
          {t("viewAllArticles")} →
        </Link>
      </header>

      {/* Article cards grid */}
      <div className="article-profile-related__grid">
        {featuredArticles.map((article) => (
          <Link
            key={article.documentId}
            href={`/articles/${article.slug}`}
            className="article-profile-related__card"
            aria-label={`Read article: ${article.title}`}
          >
            {/* Card image */}
            <div className="article-profile-related__image">
              <Image
                src={article.defaultImage?.url || "/placeholder-article.jpg"}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </div>

            {/* Card content */}
            <div className="article-profile-related__content">
              {/* Category badge */}
              {article.category && (
                <span className="article-profile-related__category">{article.category}</span>
              )}

              {/* Title */}
              <h3 className="article-profile-related__card-title">{article.title}</h3>

              {/* Meta info */}
              {article.publishedAt && (
                <div className="article-profile-related__meta">
                  <i className="bx bx-calendar" />
                  <time dateTime={article.publishedAt}>
                    {format(parseISO(article.publishedAt), "MMM d, yyyy")}
                  </time>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
