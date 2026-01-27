"use client"

import { useCallback, useEffect, useState } from "react"
import { useIntersection } from "@/hooks/useIntersection"
import type { Pagination, Player } from "@/models/strapi"
import Loader from "../layout/loader"
import { getPlayers } from "./get.action"
import PlayerGrid from "./grid"

interface PlayerFilters {
  position?: string
  letter?: string
}

interface LoadMoreProps {
  pagination: Pagination
  filters?: PlayerFilters
}

export default function LoadMore({ pagination, filters }: LoadMoreProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [isVisible, triggerRef] = useIntersection("800px")

  const loadMore = useCallback(() => {
    getPlayers(pagination.page + 1, pagination.pageSize, filters?.position, filters?.letter).then(
      (res) => {
        const players = (res.players_connection?.nodes || []) as Player[]
        setPlayers(players)
      }
    )
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    if (isVisible) {
      loadMore()
    }
  }, [loadMore, isVisible])

  if (pagination.page === pagination.pageCount) return null

  if (players.length === 0)
    return (
      <div ref={triggerRef}>
        <Loader />
      </div>
    )

  const newPagination = { ...pagination, page: pagination.page + 1 }

  return (
    <>
      <PlayerGrid players={players} />
      <LoadMore pagination={newPagination} filters={filters} />
    </>
  )
}
