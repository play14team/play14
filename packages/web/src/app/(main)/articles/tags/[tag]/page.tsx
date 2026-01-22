import Filters from "@/components/articles/filters"
import { getAllArticles, getArticleTags } from "@/components/articles/get.action"
import ArticleGrid from "@/components/articles/grid"

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const tags = await getArticleTags()
  console.log(`[Build] Pre-generating ${tags.length} article tag pages`)
  return tags.map((tag) => ({ tag: encodeURIComponent(tag) }))
}

export default async function ArticleTag(props: {
  params: Promise<{ tag: string }>
}) {
  const params = await props.params
  const articles = await getAllArticles(undefined, params.tag)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name={`Found ${articles.length} articles with tag "${params.tag}"`} />
      </div>
      <div className="pt-70">
        <ArticleGrid articles={articles} />
      </div>
    </>
  )
}
