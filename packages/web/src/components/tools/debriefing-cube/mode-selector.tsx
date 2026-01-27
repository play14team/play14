"use client"

import type { GameMode } from "@/models/debriefing-cube"

interface ModeSelectorProps {
  mode: GameMode
  onChange: (mode: GameMode) => void
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="debriefing-cube-mode-selector">
      <button
        type="button"
        className={`debriefing-cube-mode-selector__button ${
          mode === "dice" ? "debriefing-cube-mode-selector__button--active" : ""
        }`}
        onClick={() => onChange("dice")}
        aria-pressed={mode === "dice"}
      >
        <i className="bx bx-dice-5" />
        Roll dice
      </button>
      <button
        type="button"
        className={`debriefing-cube-mode-selector__button ${
          mode === "random" ? "debriefing-cube-mode-selector__button--active" : ""
        }`}
        onClick={() => onChange("random")}
        aria-pressed={mode === "random"}
      >
        <i className="bx bx-shuffle" />
        Random card
      </button>
    </div>
  )
}
