"use client"

import Link from "next/link"

interface PlayerProfileActionsProps {
  playerSlug: string
  isSubmitting: boolean
}

export default function PlayerProfileActions({
  playerSlug,
  isSubmitting,
}: PlayerProfileActionsProps) {
  return (
    <div className="profile-edit-actions">
      {/* Action Buttons */}
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
