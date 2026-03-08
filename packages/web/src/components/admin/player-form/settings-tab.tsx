"use client"

import { useState } from "react"
import type { LinkedInAccountStatus } from "@/app/(admin)/admin/linkedin/linkedin.action"
import LinkedInConnect from "@/components/admin/linkedin-connect"
import { subscribeToNewsletter } from "@/components/newsletter/subscribe.action"
import { useToast } from "../toast"
import { changePassword, updateMySettings } from "./settings.action"

const TSHIRT_SIZES = ["none", "XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const

interface SettingsTabProps {
  email: string
  username: string
  defaultTshirtSize: string
  defaultFoodPreferences: string
  linkedInAccount?: LinkedInAccountStatus | null
}

export default function SettingsTab({
  email,
  username,
  defaultTshirtSize: initialTshirtSize,
  defaultFoodPreferences: initialFoodPreferences,
  linkedInAccount,
}: SettingsTabProps) {
  const toast = useToast()

  // Event defaults state
  const [tshirtSize, setTshirtSize] = useState(initialTshirtSize)
  const [foodPreferences, setFoodPreferences] = useState(initialFoodPreferences)
  const [isSavingDefaults, setIsSavingDefaults] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState(email)
  const [newsletterName, setNewsletterName] = useState("")
  const [isSubscribing, setIsSubscribing] = useState(false)

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingDefaults(true)

    const result = await updateMySettings({
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPassword(true)

    const result = await changePassword(currentPassword, newPassword, confirmPassword)

    if (result.success) {
      toast.success("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      toast.error(result.error || "Failed to change password")
    }

    setIsChangingPassword(false)
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubscribing(true)

    const result = await subscribeToNewsletter(newsletterEmail, newsletterName, "profile")

    if (result.success) {
      toast.success("Subscribed to newsletter!")
    } else {
      toast.error(result.error || "Failed to subscribe")
    }

    setIsSubscribing(false)
  }

  return (
    <>
      {/* Account information */}
      <div className="admin-form-section">
        <h2>Account</h2>
        <p className="admin-form-section-description">Your account information.</p>

        <div className="settings-account-info">
          <div className="settings-info-item">
            <i className="bx bx-envelope" />
            <div>
              <span className="settings-info-label">Email</span>
              <span className="settings-info-value">{email}</span>
            </div>
          </div>
          <div className="settings-info-item">
            <i className="bx bx-user" />
            <div>
              <span className="settings-info-label">Username</span>
              <span className="settings-info-value">{username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="admin-form-section">
        <h2>Change password</h2>
        <p className="admin-form-section-description">
          Update your account password. You will need to enter your current password.
        </p>

        <form onSubmit={handleChangePassword}>
          <div className="admin-form-group">
            <label htmlFor="currentPassword">Current password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="admin-input"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="settings-password-row">
            <div className="admin-form-group">
              <label htmlFor="newPassword">New password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="admin-input"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="admin-input"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {isChangingPassword ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Changing...
              </>
            ) : (
              <>
                <i className="bx bx-lock-alt" />
                Change password
              </>
            )}
          </button>
        </form>
      </div>

      {/* Event defaults */}
      <div className="admin-form-section">
        <h2>Event defaults</h2>
        <p className="admin-form-section-description">
          These defaults are used to pre-fill ticket purchase forms.
        </p>

        <form onSubmit={handleSaveDefaults}>
          <div className="settings-defaults-row">
            <div className="admin-form-group">
              <label htmlFor="tshirtSize">T-shirt size</label>
              <select
                id="tshirtSize"
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
              <label htmlFor="foodPreferences">Food preferences</label>
              <textarea
                id="foodPreferences"
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

      {/* LinkedIn */}
      {linkedInAccount !== undefined && (
        <div className="admin-form-section">
          <h2>LinkedIn</h2>
          <p className="admin-form-section-description">
            Connect your LinkedIn account to post event announcements and reminders from your
            personal profile.
          </p>
          <LinkedInConnect account={linkedInAccount ?? null} />
        </div>
      )}

      {/* Newsletter */}
      <div className="admin-form-section">
        <h2>Newsletter</h2>
        <p className="admin-form-section-description">
          Subscribe to the #play14 newsletter to stay up to date with community news and events.
        </p>

        <form onSubmit={handleSubscribe}>
          <div className="settings-defaults-row">
            <div className="admin-form-group">
              <label htmlFor="newsletterEmail">Email</label>
              <input
                type="email"
                id="newsletterEmail"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="admin-input"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="newsletterName">First name</label>
              <input
                type="text"
                id="newsletterName"
                value={newsletterName}
                onChange={(e) => setNewsletterName(e.target.value)}
                className="admin-input"
                placeholder="Optional"
              />
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isSubscribing || !newsletterEmail}
          >
            {isSubscribing ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <i className="bx bx-envelope" />
                Subscribe
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}
