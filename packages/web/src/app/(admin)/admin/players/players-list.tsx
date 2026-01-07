"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Avatar from "@/components/ui/avatar"
import { getPlayers, type PlayerListItem, type PlayersListResponse } from "./players.action"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

function getPositionBadgeClass(position: string): string {
  switch (position) {
    case "Founder":
      return "position-badge-founder"
    case "Mentor":
      return "position-badge-mentor"
    case "Host":
      return "position-badge-host"
    default:
      return "position-badge-player"
  }
}

export default function PlayersList() {
  const [players, setPlayers] = useState<PlayerListItem[]>([])
  const [pagination, setPagination] = useState<PlayersListResponse["meta"]["pagination"]>({
    page: 1,
    pageSize: 40,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPlayers = useCallback(async (letter: string | null, page = 1, search?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getPlayers(letter || undefined, page, 40, search || undefined)
      setPlayers(result.data)
      setPagination(result.meta.pagination)
    } catch {
      setError("Failed to fetch players")
    }

    setIsLoading(false)
  }, [])

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    fetchPlayers(selectedLetter, 1, debouncedSearch)
  }, [fetchPlayers, selectedLetter, debouncedSearch])

  const handleLetterClick = (letter: string) => {
    if (selectedLetter === letter) {
      setSelectedLetter(null)
    } else {
      setSelectedLetter(letter)
    }
    // Clear search when using letter filter
    setSearchQuery("")
  }

  const handleClearFilter = () => {
    setSelectedLetter(null)
    setSearchQuery("")
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Clear letter filter when searching
    if (value) {
      setSelectedLetter(null)
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchPlayers(selectedLetter, newPage, debouncedSearch)
  }

  if (isLoading && players.length === 0) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin"></i>
        <span>Loading players...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle"></i>
        <p>{error}</p>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => fetchPlayers(selectedLetter)}
        >
          <i className="bx bx-refresh"></i>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="players-list">
      <div className="players-toolbar">
        <div className="players-search">
          <div className="search-input-wrapper">
            <i className="bx bx-search"></i>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
              >
                <i className="bx bx-x"></i>
              </button>
            )}
          </div>
        </div>
        <div className="players-alphabet-filter">
          <button
            type="button"
            className={`alphabet-btn ${selectedLetter === null && !searchQuery ? "active" : ""}`}
            onClick={handleClearFilter}
          >
            All
          </button>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              className={`alphabet-btn ${selectedLetter === letter ? "active" : ""}`}
              onClick={() => handleLetterClick(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="players-count">
          {pagination.total} player{pagination.total !== 1 ? "s" : ""}
          {selectedLetter && ` starting with "${selectedLetter}"`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin"></i>
          <span>Loading...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="players-empty">
          <i className="bx bx-user-x"></i>
          <p>
            {selectedLetter
              ? `No players found starting with "${selectedLetter}"`
              : "No players found"}
          </p>
          {selectedLetter && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleClearFilter}
            >
              Show All Players
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="players-grid">
            {players.map((player) => (
              <Link
                key={player.documentId}
                href={`/admin/players/${player.documentId}`}
                className="player-card"
              >
                <div className="player-card-avatar">
                  <Avatar
                    src={player.avatar?.url}
                    alt={player.name}
                    fallback={player.name}
                    size="lg"
                  />
                </div>
                <div className="player-card-info">
                  <h3 className="player-card-name">{player.name}</h3>
                  {player.company && (
                    <span className="player-card-company">{player.company}</span>
                  )}
                  <span
                    className={`player-card-position ${getPositionBadgeClass(player.position)}`}
                  >
                    {player.position}
                  </span>
                </div>
                <div className="player-card-action">
                  <i className="bx bx-chevron-right"></i>
                </div>
              </Link>
            ))}
          </div>

          {pagination.pageCount > 1 && (
            <div className="players-pagination">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <i className="bx bx-chevron-left"></i>
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pageCount}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pagination.page >= pagination.pageCount}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
                <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
