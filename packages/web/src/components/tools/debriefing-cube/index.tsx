"use client"

import { useTranslations } from "next-intl"
import { useCallback, useMemo, useReducer } from "react"
import { Link } from "@/i18n/navigation"
import type { DeckState, GameAction, GameMode, GameState, LensId } from "@/models/debriefing-cube"
import Card from "./card"
import { cards, getCardById, getLensById, lenses } from "./data/debriefing-cube-data"
import Dice from "./dice"
import ModeSelector from "./mode-selector"
import ProgressTracker from "./progress-tracker"

// Initialize deck state with all cards
function initializeDeckState(): Record<LensId, DeckState> {
  const state: Partial<Record<LensId, DeckState>> = {}

  for (const lens of lenses) {
    const lensCards = cards.filter((card) => card.lensId === lens.id)
    state[lens.id] = {
      remaining: lensCards.map((card) => card.id),
      drawn: [],
    }
  }

  return state as Record<LensId, DeckState>
}

const initialState: GameState = {
  mode: "dice",
  deckState: initializeDeckState(),
  currentCard: null,
  currentLens: null,
  isRolling: false,
  isFlipping: false,
  totalCardsDrawn: 0,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.payload }

    case "START_ROLL":
      return { ...state, isRolling: true }

    case "DICE_LANDED": {
      const lensId = action.payload
      const deck = state.deckState[lensId]

      // If this deck is empty, we need to handle this case
      // The dice component should prevent landing on empty decks
      if (deck.remaining.length === 0) {
        return { ...state, isRolling: false }
      }

      // Draw the first card from this lens
      const cardId = deck.remaining[0]
      const card = getCardById(cardId)
      const lens = getLensById(lensId)

      if (!card || !lens) {
        return { ...state, isRolling: false }
      }

      // Update deck state
      const newDeckState = {
        ...state.deckState,
        [lensId]: {
          remaining: deck.remaining.slice(1),
          drawn: [...deck.drawn, cardId],
        },
      }

      return {
        ...state,
        isRolling: false,
        isFlipping: true,
        currentCard: card,
        currentLens: lens,
        deckState: newDeckState,
        totalCardsDrawn: state.totalCardsDrawn + 1,
      }
    }

    case "DRAW_RANDOM": {
      // Collect all remaining cards across all decks
      const allRemaining: { cardId: string; lensId: LensId }[] = []

      for (const lens of lenses) {
        const deck = state.deckState[lens.id]
        for (const cardId of deck.remaining) {
          allRemaining.push({ cardId, lensId: lens.id })
        }
      }

      if (allRemaining.length === 0) {
        return state
      }

      // Pick a random card
      const randomIndex = Math.floor(Math.random() * allRemaining.length)
      const { cardId, lensId } = allRemaining[randomIndex]

      const card = getCardById(cardId)
      const lens = getLensById(lensId)

      if (!card || !lens) {
        return state
      }

      // Update deck state
      const deck = state.deckState[lensId]
      const newDeckState = {
        ...state.deckState,
        [lensId]: {
          remaining: deck.remaining.filter((id) => id !== cardId),
          drawn: [...deck.drawn, cardId],
        },
      }

      return {
        ...state,
        isFlipping: true,
        currentCard: card,
        currentLens: lens,
        deckState: newDeckState,
        totalCardsDrawn: state.totalCardsDrawn + 1,
      }
    }

    case "DRAW_FROM_LENS": {
      const lensId = action.payload
      const deck = state.deckState[lensId]

      // If this deck is empty, do nothing
      if (deck.remaining.length === 0) {
        return state
      }

      // Draw the first card from this lens
      const cardId = deck.remaining[0]
      const card = getCardById(cardId)
      const lens = getLensById(lensId)

      if (!card || !lens) {
        return state
      }

      // Update deck state
      const newDeckState = {
        ...state.deckState,
        [lensId]: {
          remaining: deck.remaining.slice(1),
          drawn: [...deck.drawn, cardId],
        },
      }

      return {
        ...state,
        isFlipping: true,
        currentCard: card,
        currentLens: lens,
        deckState: newDeckState,
        totalCardsDrawn: state.totalCardsDrawn + 1,
      }
    }

    case "CARD_REVEALED":
      return { ...state, isFlipping: false }

    case "RESET":
      return {
        ...initialState,
        mode: state.mode,
        deckState: initializeDeckState(),
      }

    default:
      return state
  }
}

export default function DebriefingCube() {
  const t = useTranslations("debriefingCube")
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const handleModeChange = useCallback((mode: GameMode) => {
    dispatch({ type: "SET_MODE", payload: mode })
  }, [])

  const handleRoll = useCallback(() => {
    dispatch({ type: "START_ROLL" })
  }, [])

  const handleDiceLanded = useCallback((lensId: LensId) => {
    dispatch({ type: "DICE_LANDED", payload: lensId })
  }, [])

  const handleDrawRandom = useCallback(() => {
    dispatch({ type: "DRAW_RANDOM" })
  }, [])

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  const handleLensClick = useCallback((lensId: LensId) => {
    dispatch({ type: "DRAW_FROM_LENS", payload: lensId })
  }, [])

  // Calculate which lenses have empty decks
  const emptyLenses = useMemo(() => {
    return lenses
      .filter((lens) => state.deckState[lens.id].remaining.length === 0)
      .map((lens) => lens.id)
  }, [state.deckState])

  // Check if all cards are drawn
  const allCardsDrawn = useMemo(() => {
    return Object.values(state.deckState).every((deck) => deck.remaining.length === 0)
  }, [state.deckState])

  return (
    <div className="debriefing-cube-page">
      <header className="debriefing-cube-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>

      <div className="debriefing-cube-content">
        <ModeSelector mode={state.mode} onChange={handleModeChange} />

        <div className="debriefing-cube-game-area">
          {state.mode === "dice" ? (
            <Dice
              onRoll={handleRoll}
              onLanded={handleDiceLanded}
              isRolling={state.isRolling}
              disabledLenses={emptyLenses}
            />
          ) : (
            <button
              type="button"
              className="debriefing-cube-draw-button"
              onClick={handleDrawRandom}
              disabled={allCardsDrawn}
            >
              <i className="bx bx-shuffle" />
              {allCardsDrawn ? t("allCardsDrawn") : t("drawRandomCard")}
            </button>
          )}

          {state.currentCard && state.currentLens ? (
            <Card card={state.currentCard} lens={state.currentLens} isNew={state.isFlipping} />
          ) : (
            <div className="debriefing-cube-empty">
              <i className="bx bx-card" />
              <h3>{t("readyToReflect")}</h3>
              <p>{state.mode === "dice" ? t("diceHint") : t("randomHint")}</p>
            </div>
          )}
        </div>
      </div>

      <ProgressTracker deckState={state.deckState} onLensClick={handleLensClick} />

      <button type="button" className="debriefing-cube-reset" onClick={handleReset}>
        <i className="bx bx-reset" />
        {t("resetAllDecks")}
      </button>

      <footer className="debriefing-cube-attribution">
        <p>
          {t.rich("createdBy", {
            chris: (chunks) => <Link href="/players/chris-caswell">{chunks}</Link>,
            julian: (chunks) => <Link href="/players/julian-kea">{chunks}</Link>,
          })}
        </p>
        <p>
          <a
            href="https://www.kilearning.net/TheDebriefingCube_EN_CC-BY_v26.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bx bx-link-external" />
            {t("originalPdf")}
          </a>
          <span className="debriefing-cube-attribution__license">
            <i className="bx bxl-creative-commons" />
            CC BY 4.0
          </span>
        </p>
      </footer>
    </div>
  )
}
