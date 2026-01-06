"use client"

import Link from "next/link"

interface PlayerFormActionsProps {
  playerSlug: string
  isSubmitting: boolean
  mode: "self" | "admin"
  currentPosition?: string
  isPositionUpdating?: boolean
  promoteTarget?: string | null
  demoteTarget?: string | null
  onPromote?: () => void
  onDemote?: () => void
}

export default function PlayerFormActions({
  playerSlug,
  isSubmitting,
  mode,
  currentPosition,
  isPositionUpdating = false,
  promoteTarget,
  demoteTarget,
  onPromote,
  onDemote,
}: PlayerFormActionsProps) {
  const canChangePosition = promoteTarget !== null || demoteTarget !== null
  const showPositionSection = mode === "admin" && currentPosition

  return (
    <div className="player-form-actions">
      {/* Position Status (admin mode only) */}
      {showPositionSection && (
        <div className="action-status">
          <span className={`position-badge position-${currentPosition.toLowerCase()}`}>
            <i className="bx bx-user-circle"></i>
            {currentPosition}
          </span>
          <p className="status-description">Current position in the community</p>
        </div>
      )}

      {/* Position Actions (admin mode only) */}
      {showPositionSection && canChangePosition && (
        <div className="position-actions">
          {promoteTarget && (
            <button
              type="button"
              className="admin-btn admin-btn-success admin-btn-block"
              onClick={onPromote}
              disabled={isPositionUpdating}
            >
              {isPositionUpdating ? (
                <i className="bx bx-loader-alt bx-spin"></i>
              ) : (
                <i className="bx bx-chevron-up"></i>
              )}
              Promote to {promoteTarget}
            </button>
          )}
          {demoteTarget && (
            <button
              type="button"
              className="admin-btn admin-btn-warning admin-btn-block"
              onClick={onDemote}
              disabled={isPositionUpdating}
            >
              {isPositionUpdating ? (
                <i className="bx bx-loader-alt bx-spin"></i>
              ) : (
                <i className="bx bx-chevron-down"></i>
              )}
              Demote to {demoteTarget}
            </button>
          )}
        </div>
      )}

      {/* Save & View Actions */}
      <div className="action-buttons">
        <button
          type="submit"
          disabled={isSubmitting}
          className="admin-btn admin-btn-primary admin-btn-block"
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="bx bx-save"></i>
              Save Changes
            </>
          )}
        </button>

        <Link
          href={`/players/${playerSlug}`}
          className="admin-btn admin-btn-secondary admin-btn-block"
          target="_blank"
        >
          <i className="bx bx-link-external"></i>
          View Public Profile
        </Link>
      </div>
    </div>
  )
}
