export type LensId =
  | "goal"
  | "process"
  | "group-dynamics"
  | "communication"
  | "emotions"
  | "take-away"

export interface Lens {
  id: LensId
  name: string
  color: string
  colorDark: string
  icon: string
  description: string
}

export interface DebriefingCard {
  id: string
  lensId: LensId
  mainQuestion: string
  followUpQuestions: string[]
}

export interface DeckState {
  remaining: string[]
  drawn: string[]
}

export type GameMode = "dice" | "random"

export interface GameState {
  mode: GameMode
  deckState: Record<LensId, DeckState>
  currentCard: DebriefingCard | null
  currentLens: Lens | null
  isRolling: boolean
  isFlipping: boolean
  totalCardsDrawn: number
}

export type GameAction =
  | { type: "SET_MODE"; payload: GameMode }
  | { type: "START_ROLL" }
  | { type: "DICE_LANDED"; payload: LensId }
  | { type: "DRAW_CARD"; payload: { card: DebriefingCard; lens: Lens } }
  | { type: "CARD_REVEALED" }
  | { type: "DRAW_RANDOM" }
  | { type: "DRAW_FROM_LENS"; payload: LensId }
  | { type: "RESET" }
