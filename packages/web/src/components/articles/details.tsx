import { format, parseISO } from "date-fns"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import type { Article, UploadFile } from "@/models/strapi"
import Gallery from "../layout/gallery"
import HtmlContent from "../layout/html-content"
import AuthorCard from "./author-card"
import ArticleInfoSidebar from "./info-sidebar"
import ArticlesNavigator from "./nav"
import RelatedSection from "./related-section"

interface ArticleDetailsProps {
  article: Article
}

/**
 * Modern article details component with horizontal hero layout.
 * Features:
 * - Hero section with image on left, metadata on right
 * - Clean typography and visual hierarchy
 * - Full-width content area below hero
 * - Gallery and related articles at bottom
 */
export default async function ArticleDetails({ article }: ArticleDetailsProps) {
  const t = await getTranslations("articles")
  const image = article.defaultImage as UploadFile
  const hasGallery = article.images && article.images.length > 0

  return (
    <article className="article-profile" aria-labelledby="article-title">
      <div className="container">
        {/* Navigation */}
        <ArticlesNavigator current={article.slug!} />

        {/* Hero section: Image left, metadata right */}
        <header className="article-profile-hero">
          {/* Left: Featured image */}
          <figure className="article-profile-hero__image">
            <Image
              src={image?.url || "/placeholder-article.jpg"}
              alt={image?.name || article.title || "Article image"}
              width={image?.width || 800}
              height={image?.height || 450}
              priority
              placeholder="blur"
              blurDataURL={
                (image as { blurhash?: string })?.blurhash || process.env.DEFAULT_BLURHASH
              }
              unoptimized
            />
          </figure>

          {/* Right: Article info */}
          <div className="article-profile-hero__info">
            {/* Category badge */}
            {article.category && (
              <span className="article-profile-hero__badge">
                <i className="bx bx-folder-open" aria-hidden="true" />
                {article.category}
              </span>
            )}

            {/* Article title */}
            <h1 id="article-title" className="article-profile-hero__title">
              {article.title}
            </h1>

            {/* Author info */}
            {article.author && (
              <div className="article-profile-hero__author">
                <AuthorCard author={article.author} variant="compact" />
              </div>
            )}

            {/* Dates */}
            <div className="article-profile-hero__dates">
              {article.publishedAt && (
                <div className="article-profile-hero__date">
                  <i className="bx bx-calendar" aria-hidden="true" />
                  <span>{t("published")}</span>
                  <time dateTime={article.publishedAt}>
                    {format(parseISO(article.publishedAt), "MMMM d, yyyy")}
                  </time>
                </div>
              )}
              {article.updatedAt && article.updatedAt !== article.publishedAt && (
                <div className="article-profile-hero__date">
                  <i className="bx bx-revision" aria-hidden="true" />
                  <span>{t("updated")}</span>
                  <time dateTime={article.updatedAt}>
                    {format(parseISO(article.updatedAt), "MMMM d, yyyy")}
                  </time>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <div className="row article-profile-main">
          {/* Main content column */}
          <div className="col-lg-8 col-md-12">
            <main className="article-profile-content">
              <HtmlContent>{article.content!}</HtmlContent>
            </main>

            {/* Author card - full version */}
            {article.author && (
              <section className="article-profile-author" aria-labelledby="about-author-heading">
                <h2 id="about-author-heading" className="visually-hidden">
                  {t("aboutAuthor")}
                </h2>
                <AuthorCard author={article.author} />
              </section>
            )}

            {/* Image gallery */}
            {hasGallery && (
              <section className="article-profile-gallery" aria-labelledby="gallery-heading">
                <h2 id="gallery-heading" className="article-profile-gallery__title">
                  <i className="bx bx-images" aria-hidden="true" />
                  {t("photoGallery")}
                </h2>
                <Gallery
                  images={
                    article.images!.filter(Boolean) as Array<{
                      url: string
                      name?: string | null
                    }>
                  }
                />
              </section>
            )}
          </div>

          {/* Sidebar with categories, tags, share */}
          <div className="col-lg-4 col-md-12">
            <ArticleInfoSidebar article={article} />
          </div>
        </div>

        {/* Related articles section */}
        <RelatedSection />
      </div>
    </article>
  )
}
