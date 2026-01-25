import type { Article, Tag } from "@/models/strapi"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import SocialLinks from "../layout/social-links"
import Separator from "../ui/separator"
import AuthorCard from "./author-card"

interface ArticleInfoSidebarProps {
  article: Article
}

/**
 * A modern sidebar component for article metadata.
 * Displays category, dates, tags, author info, and share options.
 */
export default function ArticleInfoSidebar({ article }: ArticleInfoSidebarProps) {
  const text = encodeURI("Take a look at this #play14 article")
  const tags = (article.tags?.filter(Boolean) || []) as Tag[]

  return (
    <aside className="article-info-sidebar" aria-label="Article information">
      {/* Author section */}
      {article.author && (
        <>
          <section className="article-info-section" aria-labelledby="author-heading">
            <h3 id="author-heading" className="article-info-section-title">
              <i className="bx bx-user" aria-hidden="true" />
              Written by
            </h3>
            <AuthorCard author={article.author} variant="compact" />
          </section>
          <Separator className="article-info-separator" />
        </>
      )}

      {/* Metadata section */}
      <section className="article-info-section" aria-labelledby="metadata-heading">
        <h3 id="metadata-heading" className="visually-hidden">
          Article details
        </h3>
        <ul className="article-info-list" role="list">
          {article.category && (
            <li className="article-info-item">
              <div className="article-info-icon" aria-hidden="true">
                <i className="bx bx-folder-open" />
              </div>
              <div className="article-info-content">
                <span className="article-info-label">Category</span>
                <Link
                  href={`/articles/categories/${article.category.toLowerCase()}`}
                  className="article-info-value article-info-link"
                >
                  {article.category}
                </Link>
              </div>
            </li>
          )}

          {article.publishedAt && (
            <li className="article-info-item">
              <div className="article-info-icon" aria-hidden="true">
                <i className="bx bx-calendar" />
              </div>
              <div className="article-info-content">
                <span className="article-info-label">Published</span>
                <time
                  dateTime={article.publishedAt}
                  className="article-info-value"
                >
                  {format(parseISO(article.publishedAt), "MMMM do, yyyy")}
                </time>
              </div>
            </li>
          )}

          {article.updatedAt && article.updatedAt !== article.publishedAt && (
            <li className="article-info-item">
              <div className="article-info-icon" aria-hidden="true">
                <i className="bx bx-revision" />
              </div>
              <div className="article-info-content">
                <span className="article-info-label">Updated</span>
                <time
                  dateTime={article.updatedAt}
                  className="article-info-value"
                >
                  {format(parseISO(article.updatedAt), "MMMM do, yyyy")}
                </time>
              </div>
            </li>
          )}
        </ul>
      </section>

      {/* Tags section */}
      {tags.length > 0 && (
        <>
          <Separator className="article-info-separator" />
          <section className="article-info-section" aria-labelledby="tags-heading">
            <h3 id="tags-heading" className="article-info-section-title">
              <i className="bx bx-purchase-tag" aria-hidden="true" />
              Tags
            </h3>
            <div className="article-info-tags" role="list" aria-label="Article tags">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/articles/tags/${tag.value}`}
                  className="article-info-tag"
                  role="listitem"
                >
                  {tag.value}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Share section */}
      <Separator className="article-info-separator" />
      <section className="article-info-section" aria-labelledby="share-heading">
        <h3 id="share-heading" className="article-info-section-title">
          <i className="bx bx-share-alt" aria-hidden="true" />
          Share this article
        </h3>
        <SocialLinks text={text} className="article-info-social" />
      </section>
    </aside>
  )
}
