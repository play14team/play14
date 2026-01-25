"use client"

import { useIntersection } from "@/hooks/useIntersection"
import type { Game, Pagination } from "@/models/strapi"
import { useCallback, useEffect, useState } from "react"
import Loader from "../layout/loader"
import { getGames } from "./get.action"
import GameGrid from "./grid"

interface GameFilters {
  category?: string
  tag?: string
}

interface LoadMoreProps {
  pagination: Pagination
  filters?: GameFilters
}

export default function LoadMore({ pagination, filters }: LoadMoreProps) {
  const [games, setGames] = useState<Game[]>([])
  const [isVisible, triggerRef] = useIntersection("800px")

  const loadMore = useCallback(() => {
    getGames(pagination.page + 1, pagination.pageSize, filters?.category, filters?.tag).then(
      (res) => {
        const games = (res.games_connection?.nodes || []) as Game[]
        setGames(games)
      }
    )
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    if (isVisible) {
      loadMore()
    }
  }, [loadMore, isVisible])

  if (pagination.page === pagination.pageCount) return null

  if (games.length === 0)
    return (
      <div ref={triggerRef}>
        <Loader />
      </div>
    )

  const newPagination = { ...pagination, page: pagination.page + 1 }

  return (
    <>
      <GameGrid games={games} />
      <LoadMore pagination={newPagination} filters={filters} />
    </>
  )
}
