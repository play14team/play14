"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import Avatar from "@/components/ui/avatar"
import { Link } from "@/i18n/navigation"
import { getPlayers, type PlayerListItem, type PlayersListResponse } from "./players.action"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const POSITIONS = ["Founder", "Mentor", "Host", "Player"] as const
type Position = (typeof POSITIONS)[number]

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
  const t = useTranslations("adminMisc.players.list")
  const [players, setPlayers] = useState<PlayerListItem[]>([])
  const [pagination, setPagination] = useState<PlayersListResponse["meta"]["pagination"]>({
    page: 1,
    pageSize: 30,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPlayers = useCallback(
    async (letter: string | null, page = 1, search?: string, position?: Position | null) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getPlayers(
          letter || undefined,
          page,
          30,
          search || undefined,
          position || undefined
        )
        setPlayers(result.data)
        setPagination(result.meta.pagination)
      } catch {
        setError(t("fetchFailed"))
      }

      setIsLoading(false)
    },
    []
  )

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
    fetchPlayers(selectedLetter, 1, debouncedSearch, selectedPosition)
  }, [fetchPlayers, selectedLetter, debouncedSearch, selectedPosition])

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
    setSelectedPosition(null)
    setSearchQuery("")
  }

  const handlePositionClick = (position: Position) => {
    if (selectedPosition === position) {
      setSelectedPosition(null)
    } else {
      setSelectedPosition(position)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Clear letter filter when searching
    if (value) {
      setSelectedLetter(null)
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchPlayers(selectedLetter, newPage, debouncedSearch, selectedPosition)
  }

  if (isLoading && players.length === 0) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("loadingPlayers")}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle" />
        <p>{error}</p>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => fetchPlayers(selectedLetter)}
        >
          <i className="bx bx-refresh" />
          {t("tryAgain")}
        </button>
      </div>
    )
  }

  return (
    <div className="players-list">
      <div className="players-toolbar">
        <div className="players-search">
          <div className="search-input-wrapper">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => handleSearchChange("")}
                aria-label={t("clearSearch")}
              >
                <i className="bx bx-x" />
              </button>
            )}
          </div>
        </div>
        <div className="players-position-filter">
          <button
            type="button"
            className={`position-filter-btn ${selectedPosition === null ? "active" : ""}`}
            onClick={() => setSelectedPosition(null)}
          >
            {t("all")}
          </button>
          {POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              className={`position-filter-btn ${getPositionBadgeClass(position)} ${selectedPosition === position ? "active" : ""}`}
              onClick={() => handlePositionClick(position)}
            >
              {position}
            </button>
          ))}
        </div>
        <div className="players-alphabet-filter">
          <button
            type="button"
            className={`alphabet-btn ${selectedLetter === null && !searchQuery ? "active" : ""}`}
            onClick={handleClearFilter}
          >
            {t("all")}
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
          {t("playerCount", { count: pagination.total })}
          {selectedPosition && t("withPosition", { position: selectedPosition })}
          {selectedLetter && t("startingWith", { letter: selectedLetter })}
          {searchQuery && t("matching", { query: searchQuery })}
        </div>
      </div>

      {isLoading ? (
        <div className="claims-loading">
          <i className="bx bx-loader-alt bx-spin" />
          <span>{t("loading")}</span>
        </div>
      ) : players.length === 0 ? (
        <div className="players-empty">
          <i className="bx bx-user-x" />
          <p>
            {selectedLetter ? t("noPlayersLetter", { letter: selectedLetter }) : t("noPlayers")}
          </p>
          {selectedLetter && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleClearFilter}
            >
              {t("showAll")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="players-grid">
            {players.map((player) => (
              <div key={player.documentId} className="player-card">
                <Link href={`/admin/players/${player.documentId}`} className="player-card-link">
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
                </Link>
                <div className="player-card-actions">
                  {player.inviteStatus === "pending" ? (
                    <span
                      className="player-card-status invite-status-badge invite-status-invited"
                      title={t("pending")}
                    >
                      <i className="bx bx-time" />
                      {t("pending")}
                    </span>
                  ) : player.inviteStatus === "accepted" ? (
                    <span
                      className="player-card-status invite-status-badge invite-status-accepted"
                      title={t("accepted")}
                    >
                      <i className="bx bx-check-circle" />
                      {t("accepted")}
                    </span>
                  ) : (
                    <Link
                      href={`/admin/players?tab=invite&playerId=${player.documentId}`}
                      className="player-card-invite-btn"
                      title={t("invitePlayer")}
                    >
                      <i className="bx bx-envelope" />
                    </Link>
                  )}
                  <Link
                    href={`/admin/players/${player.documentId}`}
                    className="player-card-view-btn"
                    title={t("viewPlayer")}
                  >
                    <i className="bx bx-chevron-right" />
                  </Link>
                </div>
              </div>
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
                <i className="bx bx-chevron-left" />
                {t("previous")}
              </button>
              <span className="pagination-info">
                {t("pageOf", { page: pagination.page, pageCount: pagination.pageCount })}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={pagination.page >= pagination.pageCount}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                {t("next")}
                <i className="bx bx-chevron-right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
