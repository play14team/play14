import Filters from "@/components/players/filters"
import PlayerGrid from "@/components/players/grid"
import LoadMore from "@/components/players/load-more"
import AlphabetNav from "@/components/players/alphabet-nav"
import ScrollToTop from "@/components/layout/scroll-to-top"
import { Player } from "@/models/strapi"
import { Metadata } from "next"
import {
  getPlayers,
  getPlayerLetterCounts,
} from "@/components/players/get.action"

export const metadata: Metadata = {
  title: "Players",
}

export const revalidate = 3600

export default async function Players() {
  // Fetch letter counts for navigation
  const letterCounts = await getPlayerLetterCounts()

  // All mode: paginated infinite scroll
  const response = (await getPlayers(1, 24)) as {
    players_connection?: {
      nodes: Player[]
      pageInfo: {
        page: number
        pageSize: number
        total: number
        pageCount: number
      }
    }
  }
  const players = (response?.players_connection?.nodes || []) as Player[]
  const pagination = response?.players_connection?.pageInfo || {
    total: 0,
    page: 1,
    pageSize: 24,
    pageCount: 1,
  }

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name="Players" />
        <p>Total: {pagination.total}</p>
        <AlphabetNav currentLetter={undefined} letterCounts={letterCounts} />
      </div>
      <PlayerGrid players={players} />
      <LoadMore pagination={pagination} />
      <ScrollToTop />
    </>
  )
}
