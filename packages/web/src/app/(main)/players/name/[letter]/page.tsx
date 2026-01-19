import ScrollToTop from "@/components/layout/scroll-to-top"
import AlphabetNav from "@/components/players/alphabet-nav"
import Filters from "@/components/players/filters"
import { getAllPlayers, getPlayerLetterCounts } from "@/components/players/get.action"
import PlayerGrid from "@/components/players/grid"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Players",
}

export const revalidate = 3600

export default async function PlayersByLetter(props: {
  params: Promise<{ letter: string }>
}) {
  const params = await props.params
  const rawLetter = params.letter.toUpperCase()

  // Fetch letter counts for navigation
  const letterCounts = await getPlayerLetterCounts()

  // Validate letter parameter: must be single A-Z character with players
  if (!/^[A-Z]$/.test(rawLetter) || letterCounts[rawLetter] === 0) {
    notFound()
  }

  // Fetch ALL players starting with letter
  const allPlayers = await getAllPlayers(undefined, rawLetter)

  // Sort players using locale-aware sorting to handle accented characters correctly
  const players = allPlayers.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  )

  const pagination = {
    total: players.length,
    page: 1,
    pageSize: players.length,
    pageCount: 1,
  }

  return (
    <>
      <div className="centered pt-5 pb-5">
        <Filters name="Players" />
        <p>Total: {pagination.total}</p>
        <AlphabetNav currentLetter={rawLetter} letterCounts={letterCounts} />
      </div>
      <PlayerGrid players={players} />
      <ScrollToTop />
    </>
  )
}
