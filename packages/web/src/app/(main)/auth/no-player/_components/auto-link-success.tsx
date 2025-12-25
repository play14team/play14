"use client"

import Image from "next/image"
import Logo from "@/components/layout/logo"
import type { PlayerSuggestion } from "@/components/auth/player-linking/types"

interface AutoLinkSuccessProps {
  player: PlayerSuggestion
  onComplete: () => void
}

export default function AutoLinkSuccess({ player, onComplete }: AutoLinkSuccessProps) {
  return (
    <div className="player-linking-success">
      <Logo width={120} height={40} />
      <div className="player-linking-icon success">
        <i className="bx bx-check-circle"></i>
      </div>
      <h1>Profile Found!</h1>
      <p>We found a player profile that matches your name.</p>

      <div className="player-linking-player-card">
        <div className="player-avatar">
          {player.avatar ? (
            <Image
              src={player.avatar.url}
              alt={player.name}
              width={80}
              height={80}
              style={{ objectFit: "cover", borderRadius: "50%" }}
              unoptimized
            />
          ) : (
            <Image
              src="/default-player.png"
              alt="default"
              width={80}
              height={80}
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
      </div>

      <p>Linking your account...</p>
      <div className="player-linking-spinner">
        <i className="bx bx-loader-alt bx-spin"></i>
      </div>
    </div>
  )
}
