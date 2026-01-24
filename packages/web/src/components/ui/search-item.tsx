"use client"

import { type ScoredSearchItem, getHighlightSegments } from "@/hooks/use-fuzzy-search"
import clsx from "clsx"
import Image from "next/image"

interface SearchItemProps {
  item: ScoredSearchItem
  isActive: boolean
  onClick: () => void
}

const typeIcons: Record<ScoredSearchItem["type"], string> = {
  event: "bx-calendar-event",
  player: "bx-user",
  game: "bx-game",
  article: "bx-news",
}

export default function SearchItem({ item, isActive, onClick }: SearchItemProps) {
  const nameSegments = getHighlightSegments(item.name, item.matches, "name")
  const subtitleSegments = item.subtitle
    ? getHighlightSegments(item.subtitle, item.matches, "subtitle")
    : null

  return (
    <button
      type="button"
      className={clsx("ui-search-item", isActive && "ui-search-item-active")}
      onClick={onClick}
      data-active={isActive}
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt=""
          width={40}
          height={40}
          className="ui-search-item-image"
          unoptimized
        />
      ) : (
        <span className="ui-search-item-icon">
          <i className={`bx ${typeIcons[item.type]}`} />
        </span>
      )}
      <span className="ui-search-item-content">
        <span className="ui-search-item-name">
          {nameSegments.map((segment, i) =>
            segment.highlighted ? <mark key={i}>{segment.text}</mark> : segment.text
          )}
        </span>
        {subtitleSegments && (
          <span className="ui-search-item-subtitle">
            {subtitleSegments.map((segment, i) =>
              segment.highlighted ? <mark key={i}>{segment.text}</mark> : segment.text
            )}
          </span>
        )}
      </span>
      <span className="ui-search-item-type">{item.type}</span>
    </button>
  )
}
