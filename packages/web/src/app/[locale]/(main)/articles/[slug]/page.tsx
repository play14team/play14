import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import ArticleDetails from "@/components/articles/details"
import { getArticle, getArticleSlugs } from "@/components/articles/get.action"
import Page from "@/components/layout/page"
import JsonLd from "@/components/seo/json-ld"
import { externalCanonical, pageMetadata, SITE_NAME, toDescription } from "@/libs/seo"
import type { SlugParamsProps } from "@/libs/slug-params"
import { articleJsonLd, breadcrumbJsonLd } from "@/libs/structured-data"
import type { Article } from "@/models/strapi"

// Enable dynamic params for articles not pre-generated
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const response = (await getArticleSlugs()) as {
      articles?: Article[]
    }
    const articles = response.articles || []
    console.log(`[Build] Pre-generating ${articles.length} article pages`)

    return articles.map((article) => ({
      slug: article.slug,
    }))
  } catch (error) {
    console.warn(
      "[Build] Failed to generate static params for articles:",
      error instanceof Error ? error.message : String(error)
    )
    console.warn("[Build] Articles will be generated on-demand at runtime")
    return []
  }
}

export async function generateMetadata(props: SlugParamsProps) {
  const [article, t] = await Promise.all([getArticle(props), getTranslations("articles")])

  if (!article) {
    return {
      title: t("articleNotFound"),
      description: t("articleNotFoundDescription"),
    }
  }

  const { slug, locale } = await props.params
  const description = toDescription(article.summary || article.content)

  return pageMetadata({
    locale,
    pathname: `/articles/${slug}`,
    title: article.title,
    description,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    authors: article.author?.name ? [article.author.name] : undefined,
    images: [article.defaultImage?.url, ...(article.images ?? []).map((i) => i?.url)],
    // Cross-posted articles point search engines at the original.
    canonical: externalCanonical(article.cannonical),
  })
}

export default async function Article(props: SlugParamsProps) {
  const { locale } = await props.params
  const [article, t] = await Promise.all([
    getArticle(props),
    getTranslations({ locale, namespace: "articles" }),
  ])

  if (!article) {
    notFound()
  }

  return (
    <Page name={article.title} hideName={true}>
      <JsonLd
        data={[
          articleJsonLd(article, locale),
          breadcrumbJsonLd(locale, [
            { name: SITE_NAME, pathname: "/" },
            { name: t("title"), pathname: "/articles" },
            { name: article.title },
          ]),
        ]}
      />
      <ArticleDetails article={article} />
    </Page>
  )
}
