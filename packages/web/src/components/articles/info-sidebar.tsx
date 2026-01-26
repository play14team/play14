import type { Article, Tag } from "@/models/strapi"
import Link from "next/link"
import SocialLinks from "../layout/social-links"
import { getArticleSidebar } from "./get.action"

interface ArticleInfoSidebarProps {
  article: Article
}

/**
 * Sidebar component for article tags, share options, categories and popular tags.
 * Author and dates are now displayed in the hero section.
 */
export default async function ArticleInfoSidebar({ article }: ArticleInfoSidebarProps) {
  const text = encodeURI("Take a look at this #play14 article")
  const articleTags = (article.tags?.filter(Boolean) || []) as Tag[]

  // Fetch all categories and tags for the sidebar
  const response = await getArticleSidebar()
  const categories = (response.categories || []) as Article[]
  const allArticles = (response.tags || []) as Article[]

  // Count categories
  const categoryCount = categories.reduce(
    (groups, item) => {
      if (item.category) {
        groups[item.category] = (groups[item.category] || 0) + 1
      }
      return groups
    },
    {} as { [key: string]: number }
  )

  // Count tags
  const tagsCount = allArticles.reduce(
    (groups, item) => {
      item.tags?.forEach((tag) => {
        if (tag?.value) {
          groups[tag.value] = (groups[tag.value] || 0) + 1
        }
      })
      return groups
    },
    {} as { [key: string]: number }
  )

  return (
    <aside className="article-profile-info" aria-label="Article information">
      {/* Tags and share card */}
      <div className="article-profile-info__card">
        {/* Article tags section */}
        {articleTags.length > 0 && (
          <div className="article-profile-tags__section article-profile-tags__section--first">
            <h4 className="article-profile-tags__title">
              <i className="bx bx-purchase-tag" aria-hidden="true" />
              Tags
            </h4>
            <div className="article-profile-tags__list" role="list" aria-label="Article tags">
              {articleTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/articles?tag=${encodeURIComponent(tag.value!)}`}
                  className="article-profile-tags__tag"
                  role="listitem"
                >
                  {tag.value}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Share section */}
        <div className="article-profile-share">
          <h4 className="article-profile-share__title">
            <i className="bx bx-share-alt" aria-hidden="true" />
            Share this article
          </h4>
          <div className="article-profile-share__links">
            <SocialLinks text={text} className="social-link" />
          </div>
        </div>
      </div>

      {/* Categories card */}
      {Object.keys(categoryCount).length > 0 && (
        <div className="article-profile-info__card">
          <h4 className="article-profile-tags__title">
            <i className="bx bx-folder-open" aria-hidden="true" />
            Categories
          </h4>
          <ul className="article-profile-categories__list">
            {Object.entries(categoryCount).map(([category, count]) => (
              <li key={category}>
                <Link
                  href={`/articles?category=${encodeURIComponent(category.toLowerCase())}`}
                  className="article-profile-categories__link"
                >
                  <span>{category}</span>
                  <span
                    className="article-profile-categories__count"
                    aria-label={`${count} articles`}
                  >
                    {count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popular tags card */}
      {Object.keys(tagsCount).length > 0 && (
        <div className="article-profile-info__card">
          <h4 className="article-profile-tags__title">
            <i className="bx bx-purchase-tag" aria-hidden="true" />
            Popular tags
          </h4>
          <div className="article-profile-tags__list">
            {Object.entries(tagsCount).map(([tag]) => (
              <Link
                key={tag}
                href={`/articles?tag=${encodeURIComponent(tag)}`}
                className="article-profile-tags__tag"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
