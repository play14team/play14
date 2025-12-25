"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Logo from "@/components/layout/logo"
import type { PlayerSuggestion } from "@/components/auth/player-linking/types"
import { searchPlayers } from "@/components/auth/player-linking/player-linking.action"

interface PlayerSearchProps {
  onClaim: (player: PlayerSuggestion) => void
  onCreate: () => void
  onBack: () => void
}

export default function PlayerSearch({
  onClaim,
  onCreate,
  onBack,
}: PlayerSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PlayerSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (query.length < 2) return

    setIsSearching(true)
    setHasSearched(true)
    try {
      const players = await searchPlayers(query)
      setResults(players)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="player-linking-search">
      <Logo width={120} height={40} />
      <h1>Find Your Profile</h1>
      <p>Search for your player profile by name.</p>

      <div className="search-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your name..."
          autoFocus
        />
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={query.length < 2 || isSearching}
        >
          {isSearching ? (
            <i className="bx bx-loader-alt bx-spin"></i>
          ) : (
            <i className="bx bx-search"></i>
          )}
        </button>
      </div>

      {hasSearched && results.length > 0 && (
        <div className="search-results">
          <h4>{results.length} profile(s) found</h4>
          <div className="player-linking-cards">
            {results.map((player) => (
              <div key={player.documentId} className="player-linking-suggestion-card">
                <div className="player-avatar">
                  {player.avatar ? (
                    <Image
                      src={player.avatar.url}
                      alt={player.name}
                      width={50}
                      height={50}
                      style={{ objectFit: "cover", borderRadius: "50%" }}
                      unoptimized
                    />
                  ) : (
                    <Image
                      src="/default-player.png"
                      alt="default"
                      width={50}
                      height={50}
                      style={{ objectFit: "cover", borderRadius: "50%" }}
                      unoptimized
                    />
                  )}
                </div>
                <div className="player-info">
                  <h3>{player.name}</h3>
                  <span className="position">{player.position}</span>
                  {player.company && <span className="company">{player.company}</span>}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onClaim(player)}
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && results.length === 0 && !isSearching && (
        <div className="no-results">
          <p>No profiles found matching &quot;{query}&quot;</p>
          <p>You can create a new profile instead.</p>
        </div>
      )}

      <div className="player-linking-actions">
        <button className="btn btn-outline" onClick={onBack}>
          <i className="bx bx-arrow-back"></i> Back
        </button>
        <button className="btn btn-secondary" onClick={onCreate}>
          Create New Profile
        </button>
      </div>
    </div>
  )
}
