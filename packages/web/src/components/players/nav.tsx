import type { Player, UploadFile } from "@/models/strapi"
import Image from "next/image"
import Link from "next/link"
import DefaultPlayerImage from "../ui/default-player-image"
import { getPlayerNav } from "./get.action"

export default async function PlayerNav({ current }: { current: string }) {
  const players = (await getPlayerNav()) as Player[]
  const index = players.findIndex((a) => a.slug === current)

  // If player not found in list, show no navigation
  if (index === -1) {
    return null
  }

  const previous = index > 0 ? players[index - 1] : null
  const next = index < players.length - 1 ? players[index + 1] : null

  return (
    <nav className="player-profile-nav">
      {previous ? (
        <Link
          href={`/players/${previous.slug}`}
          className="player-profile-nav__link player-profile-nav__link--prev"
          prefetch={false}
        >
          <ChevronIcon />
          <PlayerAvatar player={previous} />
          <span className="player-profile-nav__name">{previous.name}</span>
        </Link>
      ) : (
        <div className="player-profile-nav__placeholder" />
      )}

      {next ? (
        <Link
          href={`/players/${next.slug}`}
          className="player-profile-nav__link player-profile-nav__link--next"
          prefetch={false}
        >
          <span className="player-profile-nav__name">{next.name}</span>
          <PlayerAvatar player={next} />
          <ChevronIcon />
        </Link>
      ) : (
        <div className="player-profile-nav__placeholder" />
      )}
    </nav>
  )
}

function PlayerAvatar({ player }: { player: Player }) {
  const avatar = player.avatar as UploadFile | undefined

  if (avatar) {
    return (
      <Image
        src={avatar.url}
        alt={player.name}
        width={40}
        height={40}
        className="player-profile-nav__avatar"
        unoptimized
      />
    )
  }

  return (
    <DefaultPlayerImage
      alt={player.name}
      width={40}
      height={40}
      className="player-profile-nav__avatar"
    />
  )
}

function ChevronIcon() {
  return (
    <svg
      className="player-profile-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
