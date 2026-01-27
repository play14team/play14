"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import {
  autoLinkPlayer,
  cancelClaim,
  checkExactMatch,
  createPlayerForUser,
  getMyClaims,
  getSuggestions,
  submitClaim,
} from "@/components/auth/player-linking/player-linking.action"
import type {
  LinkingPageState,
  PendingClaim,
  PlayerSuggestion,
} from "@/components/auth/player-linking/types"
import AutoLinkSuccess from "./auto-link-success"
import ClaimFormModal from "./claim-form-modal"
import ClaimPending from "./claim-pending"
import CreatePlayerForm from "./create-player-form"
import LoadingState from "./loading-state"
import PlayerSearch from "./player-search"
import PlayerSuggestions from "./player-suggestions"

interface PlayerLinkingFlowProps {
  userEmail: string
  userName: string
}

export default function PlayerLinkingFlow({ userName }: PlayerLinkingFlowProps) {
  const router = useRouter()
  const [state, setState] = useState<LinkingPageState>("loading")
  const [exactMatchPlayer, setExactMatchPlayer] = useState<PlayerSuggestion | null>(null)
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([])
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSuggestion | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize: check for exact match or pending claims
  const initialize = useCallback(async () => {
    setState("loading")
    setError(null)

    // Check for exact match
    const matchResult = await checkExactMatch()

    if (matchResult.alreadyLinked) {
      // User already has a player, redirect to admin
      router.push("/admin")
      return
    }

    if (matchResult.hasExactMatch && matchResult.player) {
      // Found exact match, attempt auto-link
      setExactMatchPlayer(matchResult.player)
      setState("auto-linking")

      const linkResult = await autoLinkPlayer(matchResult.player.documentId)
      if (linkResult.success) {
        // Successfully linked, redirect to admin
        router.push("/admin")
        return
      }
      // Auto-link failed (maybe player was claimed in between)
      setError(linkResult.error || "Failed to link profile")
    }

    // Check for pending claims
    const claims = await getMyClaims()
    const pending = claims.find((c) => c.claimStatus === "pending")
    if (pending) {
      setPendingClaim(pending)
      setState("claim-pending")
      return
    }

    // Get suggestions based on user name
    const playerSuggestions = await getSuggestions(userName)
    if (playerSuggestions.length > 0) {
      setSuggestions(playerSuggestions)
      setState("suggestions")
    } else {
      // No suggestions, go directly to search/create options
      setState("search")
    }
  }, [userName, router])

  useEffect(() => {
    initialize()
  }, [initialize])

  // Handle claiming a player
  const handleClaim = (player: PlayerSuggestion) => {
    setSelectedPlayer(player)
    setShowClaimModal(true)
  }

  // Handle submitting a claim
  const handleSubmitClaim = async (reason: string) => {
    if (!selectedPlayer) return

    setIsSubmitting(true)
    setError(null)

    const result = await submitClaim(selectedPlayer.documentId, reason)

    if (result.success && result.claim) {
      setPendingClaim(result.claim)
      setShowClaimModal(false)
      setSelectedPlayer(null)
      setState("claim-pending")
    } else {
      setError(result.error || "Failed to submit claim")
    }

    setIsSubmitting(false)
  }

  // Handle cancelling a claim
  const handleCancelClaim = async () => {
    if (!pendingClaim) return

    setIsSubmitting(true)
    setError(null)

    const result = await cancelClaim(pendingClaim.documentId)

    if (result.success) {
      setPendingClaim(null)
      // Re-initialize to check for new state
      initialize()
    } else {
      setError(result.error || "Failed to cancel claim")
    }

    setIsSubmitting(false)
  }

  // Handle creating a new player
  const handleCreatePlayer = async (name: string, company: string) => {
    setIsSubmitting(true)
    setError(null)

    const result = await createPlayerForUser({ name, company })

    if (result.success) {
      // Successfully created and linked, redirect to admin
      router.push("/admin")
    } else {
      setError(result.error || "Failed to create player")
      setIsSubmitting(false)
    }
  }

  // Render based on current state
  return (
    <div className="player-linking">
      {error && (
        <div className="player-linking-error">
          <i className="bx bx-error-circle" />
          {error}
          <button onClick={() => setError(null)}>
            <i className="bx bx-x" />
          </button>
        </div>
      )}

      {state === "loading" && <LoadingState />}

      {state === "auto-linking" && exactMatchPlayer && (
        <AutoLinkSuccess player={exactMatchPlayer} onComplete={() => router.push("/admin")} />
      )}

      {state === "suggestions" && (
        <PlayerSuggestions
          suggestions={suggestions}
          onClaim={handleClaim}
          onNotMe={() => setState("search")}
        />
      )}

      {state === "claim-pending" && pendingClaim && (
        <ClaimPending
          claim={pendingClaim}
          onCancel={handleCancelClaim}
          onRefresh={initialize}
          isCancelling={isSubmitting}
        />
      )}

      {state === "search" && (
        <PlayerSearch
          onClaim={handleClaim}
          onCreate={() => setState("create")}
          onBack={() => {
            if (suggestions.length > 0) {
              setState("suggestions")
            } else {
              initialize()
            }
          }}
        />
      )}

      {state === "create" && (
        <CreatePlayerForm
          defaultName={userName}
          onSubmit={handleCreatePlayer}
          onBack={() => setState("search")}
          isSubmitting={isSubmitting}
        />
      )}

      {showClaimModal && selectedPlayer && (
        <ClaimFormModal
          player={selectedPlayer}
          onSubmit={handleSubmitClaim}
          onCancel={() => {
            setShowClaimModal(false)
            setSelectedPlayer(null)
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
