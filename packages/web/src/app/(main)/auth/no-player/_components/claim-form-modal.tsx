"use client"

import { useState } from "react"
import Image from "next/image"
import type { PlayerSuggestion } from "@/components/auth/player-linking/types"

interface ClaimFormModalProps {
  player: PlayerSuggestion
  onSubmit: (reason: string) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export default function ClaimFormModal({
  player,
  onSubmit,
  onCancel,
  isSubmitting,
}: ClaimFormModalProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (reason.length < 20) {
      setError("Please provide at least 20 characters explaining why this is your profile.")
      return
    }

    await onSubmit(reason)
  }

  return (
    <div className="player-linking-modal-overlay">
      <div className="player-linking-modal">
        <div className="modal-header">
          <h2>Claim this profile</h2>
          <button className="modal-close" onClick={onCancel} disabled={isSubmitting}>
            <i className="bx bx-x"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="player-linking-player-card">
            <div className="player-avatar">
              {player.avatar ? (
                <Image
                  src={player.avatar.url}
                  alt={player.name}
                  width={60}
                  height={60}
                  style={{ objectFit: "cover", borderRadius: "50%" }}
                  unoptimized
                />
              ) : (
                <Image
                  src="/default-player.png"
                  alt="default"
                  width={60}
                  height={60}
                  style={{ objectFit: "cover", borderRadius: "50%" }}
                  unoptimized
                />
              )}
            </div>
            <div className="player-info">
              <h3>{player.name}</h3>
              <span className="position">{player.position}</span>
              {player.company && <span className="company">{player.company}</span>}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reason">
                Why do you believe this is your profile?
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why this is your profile. For example: I attended #play14 Luxembourg in 2019, I'm known in the community as..."
                rows={4}
                disabled={isSubmitting}
              />
              <span className="char-count">
                {reason.length} / 20 minimum characters
              </span>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || reason.length < 20}
              >
                {isSubmitting ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin"></i> Submitting...
                  </>
                ) : (
                  "Submit Claim"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
