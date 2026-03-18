"use client"

import { useState } from "react"
import { sendSingleInvite } from "@/app/[locale]/(admin)/admin/players/invite.action"
import {
  type PlayerSettingsData,
  sendPlayerPasswordReset,
  updatePlayerSettings,
} from "@/app/[locale]/(admin)/admin/players/players.action"
import { useToast } from "../toast"

const TSHIRT_SIZES = ["none", "XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const

interface AdminSettingsTabProps {
  playerId: string
  settings: PlayerSettingsData
}

export default function AdminSettingsTab({ playerId, settings }: AdminSettingsTabProps) {
  const toast = useToast()

  // Event defaults state
  const [tshirtSize, setTshirtSize] = useState(settings.defaultTshirtSize)
  const [foodPreferences, setFoodPreferences] = useState(settings.defaultFoodPreferences)
  const [isSavingDefaults, setIsSavingDefaults] = useState(false)

  // Password reset state
  const [isSendingReset, setIsSendingReset] = useState(false)

  // Invite state (when no linked user)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingDefaults(true)

    const result = await updatePlayerSettings(playerId, {
      defaultTshirtSize: tshirtSize,
      defaultFoodPreferences: foodPreferences,
    })

    if (result.success) {
      toast.success("Event defaults saved!")
    } else {
      toast.error(result.error || "Failed to save defaults")
    }

    setIsSavingDefaults(false)
  }

  const handleSendPasswordReset = async () => {
    setIsSendingReset(true)

    const result = await sendPlayerPasswordReset(playerId)

    if (result.success) {
      toast.success("Password reset email sent!")
    } else {
      toast.error(result.error || "Failed to send password reset")
    }

    setIsSendingReset(false)
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setIsSendingInvite(true)

    const result = await sendSingleInvite(playerId, inviteEmail.trim())

    if (result.success) {
      toast.success(result.message || "Invitation sent!")
      setInviteEmail("")
    } else {
      toast.error(result.error || "Failed to send invitation")
    }

    setIsSendingInvite(false)
  }

  const hasLinkedUser = !!settings.email

  return (
    <>
      {/* Account information */}
      <div className="admin-form-section">
        <h2>Account</h2>
        <p className="admin-form-section-description">
          {hasLinkedUser
            ? "This player's linked user account."
            : "This player has no linked user account."}
        </p>

        {hasLinkedUser ? (
          <div className="settings-account-info">
            <div className="settings-info-item">
              <i className="bx bx-envelope" />
              <div>
                <span className="settings-info-label">Email</span>
                <span className="settings-info-value">{settings.email}</span>
              </div>
            </div>
            <div className="settings-info-item">
              <i className="bx bx-user" />
              <div>
                <span className="settings-info-label">Username</span>
                <span className="settings-info-value">{settings.username}</span>
              </div>
            </div>
            <div className="settings-info-item">
              <i className="bx bx-check-circle" />
              <div>
                <span className="settings-info-label">Confirmed</span>
                <span className="settings-info-value">{settings.confirmed ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="settings-info-item">
              <i className="bx bx-block" />
              <div>
                <span className="settings-info-label">Blocked</span>
                <span className="settings-info-value">{settings.blocked ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="settings-info-item">
              <i className="bx bx-key" />
              <div>
                <span className="settings-info-label">Provider</span>
                <span className="settings-info-value">{settings.provider || "—"}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="settings-invite-form">
            <div className="admin-form-group">
              <label htmlFor="invite-email">Email address</label>
              <input
                type="email"
                id="invite-email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="admin-input"
                placeholder="Enter email to send invitation"
                required
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSendingInvite || !inviteEmail.trim()}
            >
              {isSendingInvite ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <i className="bx bx-envelope" />
                  Send invitation
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Password reset */}
      {hasLinkedUser && (
        <div className="admin-form-section">
          <h2>Password reset</h2>
          <p className="admin-form-section-description">
            Send a password reset email to this player. They will receive a link to set a new
            password.
          </p>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleSendPasswordReset}
            disabled={isSendingReset}
          >
            {isSendingReset ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Sending...
              </>
            ) : (
              <>
                <i className="bx bx-mail-send" />
                Send password reset email
              </>
            )}
          </button>
        </div>
      )}

      {/* Event defaults */}
      <div className="admin-form-section">
        <h2>Event defaults</h2>
        <p className="admin-form-section-description">
          Default values used to pre-fill ticket purchase forms for this player.
        </p>

        <form onSubmit={handleSaveDefaults}>
          <div className="settings-defaults-row">
            <div className="admin-form-group">
              <label htmlFor="admin-tshirtSize">T-shirt size</label>
              <select
                id="admin-tshirtSize"
                value={tshirtSize}
                onChange={(e) => setTshirtSize(e.target.value)}
                className="admin-select"
              >
                {TSHIRT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size === "none" ? "No preference" : size}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="admin-foodPreferences">Food preferences</label>
              <textarea
                id="admin-foodPreferences"
                value={foodPreferences}
                onChange={(e) => setFoodPreferences(e.target.value)}
                className="admin-input"
                placeholder="e.g., Vegetarian, Vegan, Gluten-free, No pork..."
                rows={3}
              />
            </div>
          </div>

          <button type="submit" className="admin-btn admin-btn-primary" disabled={isSavingDefaults}>
            {isSavingDefaults ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Saving...
              </>
            ) : (
              <>
                <i className="bx bx-save" />
                Save defaults
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}
