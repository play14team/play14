import type { Article, UploadFile } from "@/models/strapi"
import Image from "next/image"
import Gallery from "../layout/gallery"
import HtmlContent from "../layout/html-content"
import Separator from "../ui/separator"
import AuthorCard from "./author-card"
import ArticleInfoSidebar from "./info-sidebar"
import ArticlesNavigator from "./nav"
import ArticleSidebar from "./sidebar"

interface ArticleDetailsProps {
  article: Article
}

/**
 * Modern article details component with improved layout, accessibility, and responsiveness.
 * Uses Bootstrap grid for consistency with player and event details pages.
 * Features a hero image, sticky info sidebar, rich content area, and related articles sidebar.
 */
export default function ArticleDetails({ article }: ArticleDetailsProps) {
  const image = article.defaultImage as UploadFile
  const hasGallery = article.images && article.images.length > 0

  return (
    <article className="article-details-area pb-100" aria-labelledby="article-title">
      {/* Navigation */}
      <ArticlesNavigator current={article.slug!} />

      {/* Hero image section */}
      <header className="article-details-hero">
        <div className="article-details-hero-image">
          <Image
            src={image?.url || "/placeholder-article.jpg"}
            alt={image?.name || article.title || "Article image"}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
            placeholder="blur"
            blurDataURL={(image as { blurhash?: string })?.blurhash || process.env.DEFAULT_BLURHASH}
            unoptimized
          />
          <div className="article-details-hero-overlay" aria-hidden="true" />
        </div>
      </header>

      {/* Main content area - using Bootstrap grid for consistency */}
      <div className="container pt-4">
        <div className="row">
          {/* Left column: Article info sidebar */}
          <div className="col-lg-3 col-md-12">
            <ArticleInfoSidebar article={article} />
          </div>

          {/* Center column: Main content */}
          <div className="col-lg-6 col-md-12">
            <main className="article-details-content">
              <HtmlContent>{article.content!}</HtmlContent>

              {/* Author card - full version at the bottom of content */}
              {article.author && (
                <>
                  <Separator className="article-details-separator" />
                  <section aria-labelledby="about-author-heading">
                    <h2 id="about-author-heading" className="visually-hidden">
                      About the author
                    </h2>
                    <AuthorCard author={article.author} />
                  </section>
                </>
              )}

              {/* Image gallery */}
              {hasGallery && (
                <>
                  <Separator className="article-details-separator" />
                  <section aria-labelledby="gallery-heading">
                    <h2 id="gallery-heading" className="article-details-section-title">
                      <i className="bx bx-images" aria-hidden="true" />
                      Gallery
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
                </>
              )}
            </main>
          </div>

          {/* Right column: Related articles sidebar */}
          <div className="col-lg-3 col-md-12">
            <ArticleSidebar />
          </div>
        </div>
      </div>
    </article>
  )
}
