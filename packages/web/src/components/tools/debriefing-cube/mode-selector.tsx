"use client"

import { useTranslations } from "next-intl"
import type { GameMode } from "@/models/debriefing-cube"

interface ModeSelectorProps {
  mode: GameMode
  onChange: (mode: GameMode) => void
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const t = useTranslations("debriefingCube")

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
        {t("rollDice")}
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
        {t("randomCard")}
      </button>
    </div>
  )
}
