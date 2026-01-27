"use client"

import { useEffect, useState } from "react"
import type { DebriefingCard, Lens } from "@/models/debriefing-cube"

interface CardProps {
  card: DebriefingCard
  lens: Lens
  isNew?: boolean
}

export default function Card({ card, lens, isNew = false }: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  useEffect(() => {
    if (isNew) {
      setIsFlipped(false)
      setIsEntering(true)

      // Start the entrance animation
      const enterTimer = setTimeout(() => {
        setIsEntering(false)
      }, 400)

      // Auto-flip after entrance
      const flipTimer = setTimeout(() => {
        setIsFlipped(true)
      }, 600)

      return () => {
        clearTimeout(enterTimer)
        clearTimeout(flipTimer)
      }
    }
  }, [card.id, isNew])

  const handleClick = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <div
      className={`debriefing-card ${isEntering ? "debriefing-card--entering" : ""}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Card: ${card.mainQuestion}. Click to ${isFlipped ? "hide" : "reveal"} the question.`}
      style={{ "--lens-color": lens.color } as React.CSSProperties}
    >
      <div
        className={`debriefing-card__inner ${isFlipped ? "debriefing-card__inner--flipped" : ""}`}
      >
        {/* Front of card (shows lens icon) */}
        <div className="debriefing-card__front">
          <i className={`bx ${lens.icon}`} />
          <span>{lens.name}</span>
        </div>

        {/* Back of card (shows question) */}
        <div className="debriefing-card__back">
          <div className="debriefing-card__lens-badge">
            <i className={`bx ${lens.icon}`} />
            {lens.name}
          </div>

          <h3 className="debriefing-card__main-question">{card.mainQuestion}</h3>

          <div className="debriefing-card__follow-up">
            <h4>Follow up with</h4>
            <ul>
              {card.followUpQuestions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
