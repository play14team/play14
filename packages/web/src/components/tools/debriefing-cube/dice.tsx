"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { LensId } from "@/models/debriefing-cube"
import { lenses } from "./data/debriefing-cube-data"

interface DiceProps {
  onRoll: () => void
  onLanded: (lensId: LensId) => void
  isRolling: boolean
  disabledLenses?: LensId[]
}

// Rotation values to show each face
const faceRotations: Record<LensId, { x: number; y: number }> = {
  goal: { x: 0, y: 0 },
  process: { x: 0, y: 180 },
  "group-dynamics": { x: 0, y: -90 },
  communication: { x: 0, y: 90 },
  emotions: { x: -90, y: 0 },
  "take-away": { x: 90, y: 0 },
}

export default function Dice({ onRoll, onLanded, isRolling, disabledLenses = [] }: DiceProps) {
  const [rotation, setRotation] = useState({ x: -20, y: 25, z: 0 })
  const [targetLens, setTargetLens] = useState<LensId | null>(null)
  const cubeRef = useRef<HTMLDivElement>(null)

  const rollDice = useCallback(() => {
    if (isRolling) return

    // Filter out disabled lenses (empty decks)
    const availableLenses = lenses.filter((lens) => !disabledLenses.includes(lens.id))

    if (availableLenses.length === 0) {
      return
    }

    // Pick a random available lens
    const randomIndex = Math.floor(Math.random() * availableLenses.length)
    const selectedLens = availableLenses[randomIndex]

    setTargetLens(selectedLens.id)
    onRoll()
  }, [isRolling, disabledLenses, onRoll])

  useEffect(() => {
    if (isRolling && targetLens) {
      // Set CSS variables for the final position
      const finalRotation = faceRotations[targetLens]

      // Apply the rolling animation
      if (cubeRef.current) {
        cubeRef.current.style.setProperty("--final-x", `${finalRotation.x}deg`)
        cubeRef.current.style.setProperty("--final-y", `${finalRotation.y}deg`)
      }

      // After animation completes, update state and notify parent
      const timer = setTimeout(() => {
        setRotation({
          x: finalRotation.x,
          y: finalRotation.y,
          z: 0,
        })
        onLanded(targetLens)
        setTargetLens(null)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isRolling, targetLens, onLanded])

  const allEmpty = disabledLenses.length >= 6

  return (
    <div
      className={`debriefing-dice ${allEmpty ? "debriefing-dice--disabled" : ""}`}
      onClick={!isRolling && !allEmpty ? rollDice : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isRolling && !allEmpty) {
          e.preventDefault()
          rollDice()
        }
      }}
      role="button"
      tabIndex={allEmpty ? -1 : 0}
      aria-label={
        allEmpty ? "All cards drawn" : isRolling ? "Rolling..." : "Click to roll the dice"
      }
      aria-disabled={allEmpty}
    >
      <div className="debriefing-dice__scene-wrapper">
        <div className="debriefing-dice__scene">
          <div
            ref={cubeRef}
            className={`debriefing-dice__cube ${isRolling ? "debriefing-dice__cube--rolling" : ""}`}
            style={{
              transform: !isRolling
                ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
                : undefined,
            }}
          >
            {lenses.map((lens) => (
              <div
                key={lens.id}
                className={`debriefing-dice__face debriefing-dice__face--${lens.id}`}
              >
                <i className={`bx ${lens.icon}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="debriefing-dice__instruction">
        {allEmpty ? "All cards drawn!" : isRolling ? "Rolling..." : "Click to roll"}
      </p>
    </div>
  )
}
