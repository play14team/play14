"use client"

import Image from "next/image"
import type { PlayerSuggestion } from "@/components/auth/player-linking/types"
import Logo from "@/components/layout/logo"
import DefaultPlayerImage from "@/components/ui/default-player-image"

interface PlayerSuggestionsProps {
  suggestions: PlayerSuggestion[]
  onClaim: (player: PlayerSuggestion) => void
  onNotMe: () => void
}

export default function PlayerSuggestions({
  suggestions,
  onClaim,
  onNotMe,
}: PlayerSuggestionsProps) {
  return (
    <div className="player-linking-suggestions">
      <Logo width={120} height={40} />
      <h1>Is this you?</h1>
      <p>We found some player profiles that might be yours.</p>

      <div className="player-linking-cards">
        {suggestions.map((player) => (
          <div key={player.documentId} className="player-linking-suggestion-card">
            <div className="player-avatar">
              {player.avatar ? (
                <Image
                  src={player.avatar.url}
                  alt={player.name}
                  width={60}
                  height={60}
                  style={{ objectFit: "cover", borderRadius: "50%" }}
                  unoptimized
                />
              ) : (
                <DefaultPlayerImage
                  alt="default"
                  width={60}
                  height={60}
                  style={{ objectFit: "cover", borderRadius: "50%" }}
                />
              )}
            </div>
            <div className="player-info">
              <h3>{player.name}</h3>
              <span className="position">{player.position}</span>
              {player.company && <span className="company">{player.company}</span>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => onClaim(player)}>
              This is me
            </button>
          </div>
        ))}
      </div>

      <div className="player-linking-actions">
        <button className="btn btn-outline" onClick={onNotMe}>
          I don&apos;t see my profile
        </button>
      </div>
    </div>
  )
}
