"use client"

import { useTranslations } from "next-intl"
import type { DeckState, LensId } from "@/models/debriefing-cube"
import { lenses } from "./data/debriefing-cube-data"

interface ProgressTrackerProps {
  deckState: Record<LensId, DeckState>
  onLensClick?: (lensId: LensId) => void
}

export default function ProgressTracker({ deckState, onLensClick }: ProgressTrackerProps) {
  const t = useTranslations("debriefingCube")
  const totalCards = 42
  const totalDrawn = Object.values(deckState).reduce((sum, deck) => sum + deck.drawn.length, 0)

  return (
    <div className="debriefing-cube-progress">
      <h3 className="debriefing-cube-progress__title">
        {t("progress", { drawn: totalDrawn, total: totalCards })}
      </h3>

      <div className="debriefing-cube-progress__grid">
        {lenses.map((lens) => {
          const deck = deckState[lens.id]
          const total = deck.remaining.length + deck.drawn.length
          const drawn = deck.drawn.length
          const percentage = total > 0 ? (drawn / total) * 100 : 0
          const isEmpty = deck.remaining.length === 0

          const handleClick = () => {
            if (!isEmpty && onLensClick) {
              onLensClick(lens.id)
            }
          }

          const handleKeyDown = (e: React.KeyboardEvent) => {
            if ((e.key === "Enter" || e.key === " ") && !isEmpty && onLensClick) {
              e.preventDefault()
              onLensClick(lens.id)
            }
          }

          return (
            <div
              key={lens.id}
              className={`debriefing-cube-progress__item ${isEmpty ? "debriefing-cube-progress__item--empty" : ""}`}
              style={{ "--lens-color": lens.color } as React.CSSProperties}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex={isEmpty ? -1 : 0}
              aria-label={
                isEmpty
                  ? t("deckEmpty", { name: lens.name })
                  : t("drawFromDeck", { name: lens.name })
              }
              aria-disabled={isEmpty}
            >
              <div className="debriefing-cube-progress__icon">
                <i className={`bx ${lens.icon}`} />
              </div>
              <div className="debriefing-cube-progress__info">
                <p className="debriefing-cube-progress__name">{lens.name}</p>
                <p className="debriefing-cube-progress__count">
                  {drawn} / {total}
                </p>
                <div className="debriefing-cube-progress__bar">
                  <div
                    className="debriefing-cube-progress__bar-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
