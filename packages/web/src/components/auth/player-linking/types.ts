/**
 * Types for player linking functionality
 */

export interface PlayerSuggestion {
  documentId: string
  name: string
  slug: string
  position: string
  company?: string | null
  avatar?: {
    url: string
    width: number
    height: number
  } | null
  score?: number
}

export interface ExactMatchResult {
  hasExactMatch: boolean
  alreadyLinked: boolean
  player: PlayerSuggestion | null
}

export interface PendingClaim {
  documentId: string
  claimStatus: "pending" | "approved" | "rejected"
  reason: string
  adminNotes?: string | null
  createdAt: string
  processedAt?: string | null
  player: PlayerSuggestion
}

export interface CreatePlayerData {
  name: string
  company?: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

export interface AutoLinkResult extends ActionResult {
  player?: PlayerSuggestion
}

export interface CreatePlayerResult extends ActionResult {
  player?: PlayerSuggestion
}

export interface ClaimResult extends ActionResult {
  claim?: PendingClaim
}

export type LinkingPageState =
  | "loading"
  | "auto-linking"
  | "suggestions"
  | "claim-pending"
  | "search"
  | "create"
