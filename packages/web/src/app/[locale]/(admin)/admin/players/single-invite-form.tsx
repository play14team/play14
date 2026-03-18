"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, useTransition } from "react"
import Avatar from "@/components/ui/avatar"
import {
  getPlayerForInvite,
  type PlayerForInvite,
  searchPlayersForInvite,
  sendSingleInvite,
} from "./invite.action"

interface SingleInviteFormProps {
  preSelectedPlayerId?: string | null
}

function getPositionBadgeClass(position: string): string {
  switch (position) {
    case "Founder":
      return "position-badge-founder"
    case "Mentor":
      return "position-badge-mentor"
    case "Host":
      return "position-badge-host"
    default:
      return "position-badge-player"
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SingleInviteForm({ preSelectedPlayerId }: SingleInviteFormProps) {
  const t = useTranslations("adminMisc.players.invite")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<PlayerForInvite[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerForInvite | null>(null)
  const [isLoadingPreSelected, setIsLoadingPreSelected] = useState(false)
  const [email, setEmail] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    error?: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const preSelectedLoadedRef = useRef<string | null>(null)

  // Load pre-selected player
  useEffect(() => {
    if (preSelectedPlayerId && preSelectedPlayerId !== preSelectedLoadedRef.current) {
      preSelectedLoadedRef.current = preSelectedPlayerId
      setIsLoadingPreSelected(true)
      getPlayerForInvite(preSelectedPlayerId).then((player) => {
        if (player) {
          setSelectedPlayer(player)
          if (player.user?.email) {
            setEmail(player.user.email)
          }
        }
        setIsLoadingPreSelected(false)
      })
    }
  }, [preSelectedPlayerId])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchPlayersForInvite(searchQuery)
      setSearchResults(results)
      setIsSearching(false)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleSelectPlayer = (player: PlayerForInvite) => {
    setSelectedPlayer(player)
    setSearchQuery("")
    setSearchResults([])
    setResult(null)
    // If player has a user with email, pre-fill it
    if (player.user?.email) {
      setEmail(player.user.email)
    }
  }

  const handleClearPlayer = () => {
    setSelectedPlayer(null)
    setEmail("")
    setCustomMessage("")
    setSubscribeNewsletter(true)
    setEmailError(null)
    setResult(null)
    // Focus on search input
    searchInputRef.current?.focus()
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setEmailError(null)
    setResult(null)
  }

  const validateForm = (): boolean => {
    if (!selectedPlayer) {
      return false
    }

    if (!email.trim()) {
      setEmailError(t("emailRequired"))
      return false
    }

    if (!isValidEmail(email.trim())) {
      setEmailError(t("emailInvalid"))
      return false
    }

    return true
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResult(null)

    if (!validateForm() || !selectedPlayer) {
      return
    }

    startTransition(async () => {
      const response = await sendSingleInvite(
        selectedPlayer.documentId,
        email.trim(),
        customMessage.trim() || undefined,
        subscribeNewsletter
      )

      if (response.success) {
        setResult({
          success: true,
          message: response.message || `Invitation sent to ${email.trim()}`,
        })
        // Reset form after success
        setSelectedPlayer(null)
        setEmail("")
        setCustomMessage("")
        setSubscribeNewsletter(true)
      } else {
        setResult({
          success: false,
          error: response.error || "Failed to send invitation",
        })
      }
    })
  }

  const getUserStatusBadge = () => {
    if (!selectedPlayer?.user) {
      return (
        <span className="invite-status-badge invite-status-new">
          <i className="bx bx-user-plus" />
          {t("newAccount")}
        </span>
      )
    }

    const status = selectedPlayer.user.invitationStatus

    if (selectedPlayer.user.blocked) {
      return (
        <span className="invite-status-badge invite-status-blocked">
          <i className="bx bx-block" />
          {t("blocked")}
        </span>
      )
    }

    if (status === "accepted") {
      return (
        <span className="invite-status-badge invite-status-accepted">
          <i className="bx bx-check-circle" />
          {t("accountActivated")}
        </span>
      )
    }

    if (status === "sent" || status === "reminded") {
      return (
        <span className="invite-status-badge invite-status-invited">
          <i className="bx bx-time" />
          {t("invitationPending")}
        </span>
      )
    }

    return (
      <span className="invite-status-badge invite-status-pending">
        <i className="bx bx-envelope" />
        {t("readyToInvite")}
      </span>
    )
  }

  const isBlocked = selectedPlayer?.user?.blocked
  const canSubmit = selectedPlayer && email.trim() && !isBlocked && !isPending

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="admin-form-section">
        <h2>{t("title")}</h2>
        <p className="admin-form-section-description">{t("description")}</p>

        {/* Player Search */}
        <div className="admin-form-group">
          <label htmlFor="player-search">{t("selectPlayer")}</label>
          {isLoadingPreSelected ? (
            <div className="invite-search-loading-inline">
              <i className="bx bx-loader-alt bx-spin" />
              <span>{t("loadingPlayer")}</span>
            </div>
          ) : (
            <div className="invite-search-wrapper">
              <div className="search-input-wrapper">
                <i className="bx bx-search" />
                <input
                  ref={searchInputRef}
                  id="player-search"
                  type="text"
                  placeholder="Search players by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  disabled={isPending || !!selectedPlayer}
                />
                {searchQuery && !selectedPlayer && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <i className="bx bx-x" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchQuery && searchResults.length > 0 && (
                <div className="invite-search-results">
                  {searchResults.map((player) => (
                    <button
                      key={player.documentId}
                      type="button"
                      className="invite-search-result"
                      onClick={() => handleSelectPlayer(player)}
                    >
                      <Avatar
                        src={player.avatar?.url}
                        alt={player.name}
                        fallback={player.name}
                        size="sm"
                      />
                      <div className="invite-search-result-info">
                        <span className="invite-search-result-name">{player.name}</span>
                        {player.company && (
                          <span className="invite-search-result-company">{player.company}</span>
                        )}
                      </div>
                      <span
                        className={`player-card-position ${getPositionBadgeClass(player.position)}`}
                      >
                        {player.position}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchQuery &&
                searchQuery.length >= 2 &&
                !isSearching &&
                searchResults.length === 0 && (
                  <div className="invite-search-results">
                    <div className="invite-search-no-results">
                      <i className="bx bx-search-alt" />
                      <span>No players found matching &quot;{searchQuery}&quot;</span>
                    </div>
                  </div>
                )}

              {/* Loading */}
              {isSearching && (
                <div className="invite-search-results">
                  <div className="invite-search-loading">
                    <i className="bx bx-loader-alt bx-spin" />
                    <span>Searching...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Player Card */}
        {selectedPlayer && (
          <div className="admin-form-group">
            <div className="invite-selected-player">
              <div className="invite-selected-player-card">
                <Avatar
                  src={selectedPlayer.avatar?.url}
                  alt={selectedPlayer.name}
                  fallback={selectedPlayer.name}
                  size="lg"
                />
                <div className="invite-selected-player-info">
                  <h4 className="invite-selected-player-name">{selectedPlayer.name}</h4>
                  {selectedPlayer.company && (
                    <span className="invite-selected-player-company">{selectedPlayer.company}</span>
                  )}
                  <span
                    className={`player-card-position ${getPositionBadgeClass(selectedPlayer.position)}`}
                  >
                    {selectedPlayer.position}
                  </span>
                  {getUserStatusBadge()}
                </div>
                <button
                  type="button"
                  className="invite-selected-player-clear"
                  onClick={handleClearPlayer}
                  aria-label="Clear selection"
                >
                  <i className="bx bx-x" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Input */}
        {selectedPlayer && (
          <div className="admin-form-group">
            <label htmlFor="email">{t("emailLabel")}</label>
            <input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`admin-input ${emailError ? "admin-input-error" : ""}`}
              disabled={isPending || isBlocked}
            />
            {emailError && <p className="admin-form-error">{emailError}</p>}
            {!emailError && selectedPlayer.user?.email && email !== selectedPlayer.user.email && (
              <p className="admin-form-help">
                {t("emailDiffers", { email: selectedPlayer.user.email })}
              </p>
            )}
          </div>
        )}

        {/* Custom Message */}
        {selectedPlayer && !isBlocked && (
          <div className="admin-form-group">
            <label htmlFor="custom-message">{t("customMessage")}</label>
            <textarea
              id="custom-message"
              placeholder={t("customMessagePlaceholder")}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="admin-input admin-textarea"
              rows={3}
              disabled={isPending}
            />
            <p className="admin-form-help">{t("customMessageHelp")}</p>
          </div>
        )}

        {/* Newsletter Subscription */}
        {selectedPlayer && !isBlocked && (
          <div className="admin-form-group">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={subscribeNewsletter}
                onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                disabled={isPending}
              />
              <span>{t("subscribeNewsletter")}</span>
            </label>
            <p className="admin-form-help">{t("subscribeHelp")}</p>
          </div>
        )}

        {/* Warnings */}
        {selectedPlayer?.user?.invitationStatus === "accepted" && (
          <div className="admin-form-section admin-info-section admin-info-warning">
            <p className="admin-form-help">
              <i className="bx bx-info-circle" />
              {t("alreadyActivated")}
            </p>
          </div>
        )}

        {isBlocked && (
          <div className="admin-form-section admin-info-section admin-info-error">
            <p className="admin-form-help">
              <i className="bx bx-error-circle" />
              {t("userBlocked")}
            </p>
          </div>
        )}
      </div>

      {/* Result Messages */}
      {result && (
        <div
          className={`admin-form-section admin-info-section ${result.success ? "admin-info-success" : "admin-info-error"}`}
        >
          <p className="admin-form-help">
            <i className={`bx ${result.success ? "bx-check-circle" : "bx-error-circle"}`} />
            {result.success ? result.message : result.error}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={!canSubmit}>
          {isPending ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              Sending...
            </>
          ) : selectedPlayer?.user?.invitationStatus === "accepted" ? (
            <>
              <i className="bx bx-envelope" />
              {t("sendPasswordReset")}
            </>
          ) : (
            <>
              <i className="bx bx-envelope" />
              {t("sendInvite")}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
