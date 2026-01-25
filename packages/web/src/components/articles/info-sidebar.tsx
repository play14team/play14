import type { Article, Tag } from "@/models/strapi"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import SocialLinks from "../layout/social-links"
import AuthorCard from "./author-card"

interface ArticleInfoSidebarProps {
  article: Article
}

/**
 * A sidebar component for article metadata.
 * Uses the same styling pattern as player sidebar (case-studies-details-info).
 * Displays author, category, dates, tags, and share options.
 */
export default function ArticleInfoSidebar({ article }: ArticleInfoSidebarProps) {
  const text = encodeURI("Take a look at this #play14 article")
  const tags = (article.tags?.filter(Boolean) || []) as Tag[]

  return (
    <aside className="case-studies-sidebar-sticky" aria-label="Article information">
      <div className="case-studies-details-info">
        <ul>
          {/* Author */}
          {article.author && (
            <li>
              <div className="icon" aria-hidden="true">
                <i className="bx bx-user" />
              </div>
              <span>Written by</span>
              <AuthorCard author={article.author} variant="compact" />
            </li>
          )}

          {/* Category */}
          {article.category && (
            <li>
              <div className="icon" aria-hidden="true">
                <i className="bx bx-folder-open" />
              </div>
              <span>Category</span>
              <Link href={`/articles/categories/${article.category.toLowerCase()}`}>
                {article.category}
              </Link>
            </li>
          )}

          {/* Published date */}
          {article.publishedAt && (
            <li>
              <div className="icon" aria-hidden="true">
                <i className="bx bx-calendar" />
              </div>
              <span>Published</span>
              <time dateTime={article.publishedAt}>
                {format(parseISO(article.publishedAt), "MMMM do, yyyy")}
              </time>
            </li>
          )}

          {/* Updated date */}
          {article.updatedAt && article.updatedAt !== article.publishedAt && (
            <li>
              <div className="icon" aria-hidden="true">
                <i className="bx bx-revision" />
              </div>
              <span>Updated</span>
              <time dateTime={article.updatedAt}>
                {format(parseISO(article.updatedAt), "MMMM do, yyyy")}
              </time>
            </li>
          )}
        </ul>

        {/* Tags section */}
        {tags.length > 0 && (
          <div className="article-tags-section">
            <h4 className="article-tags-title">
              <i className="bx bx-purchase-tag" aria-hidden="true" />
              Tags
            </h4>
            <div className="article-tags" role="list" aria-label="Article tags">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/articles/tags/${tag.value}`}
                  className="article-tag"
                  role="listitem"
                >
                  {tag.value}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Share section */}
        <div className="events-share">
          <div className="share-info">
            <span>
              Share this article <i className="flaticon-share" aria-hidden="true" />
            </span>
            <SocialLinks text={text} className="social-link" />
          </div>
        </div>
      </div>
    </aside>
  )
}
