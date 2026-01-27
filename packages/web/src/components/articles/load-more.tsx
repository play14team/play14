"use client"

import { useCallback, useEffect, useState } from "react"
import { useIntersection } from "@/hooks/useIntersection"
import type { Article, Pagination } from "@/models/strapi"
import Loader from "../layout/loader"
import { getArticles } from "./get.action"
import ArticleGrid from "./grid"

interface ArticleFilters {
  category?: string
  tag?: string
}

interface LoadMoreProps {
  pagination: Pagination
  filters?: ArticleFilters
}

export default function LoadMore({ pagination, filters }: LoadMoreProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [isVisible, triggerRef] = useIntersection("800px")

  const loadMore = useCallback(() => {
    getArticles(pagination.page + 1, pagination.pageSize, filters?.category, filters?.tag).then(
      (res) => {
        const articles = (res.articles_connection?.nodes || []) as Article[]
        setArticles(articles)
      }
    )
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    if (isVisible) {
      loadMore()
    }
  }, [loadMore, isVisible])

  if (pagination.page === pagination.pageCount) return null

  if (articles.length === 0)
    return (
      <div ref={triggerRef}>
        <Loader />
      </div>
    )

  const newPagination = { ...pagination, page: pagination.page + 1 }

  return (
    <>
      <ArticleGrid articles={articles} />
      <LoadMore pagination={newPagination} filters={filters} />
    </>
  )
}
