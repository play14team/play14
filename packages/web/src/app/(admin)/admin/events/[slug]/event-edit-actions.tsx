"use client"

import Link from "next/link"

interface EventEditActionsProps {
  eventSlug: string
  isPublished: boolean
  isSubmitting: boolean
  isPublishing: boolean
  isDirty: boolean
  onPublishToggle: () => void
  onDiscard: () => void
}

export default function EventEditActions({
  eventSlug,
  isPublished,
  isSubmitting,
  isPublishing,
  isDirty,
  onPublishToggle,
  onDiscard,
}: EventEditActionsProps) {
  return (
    <div className="event-edit-actions">
      {/* Publication Status */}
      <div className="action-status">
        <span className={`publication-badge ${isPublished ? "published" : "draft"}`}>
          {isPublished ? (
            <>
              <i className="bx bx-check-circle"></i>
              Published
            </>
          ) : (
            <>
              <i className="bx bx-edit"></i>
              Draft
            </>
          )}
        </span>
        <p className="status-description">
          {isPublished ? "This event is visible to the public." : "Only visible to organizers."}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {!isPublished && (
          <Link
            href={`/admin/events/${eventSlug}/preview`}
            className="admin-btn admin-btn-secondary admin-btn-block"
          >
            <i className="bx bx-show"></i>
            Preview
          </Link>
        )}

        {isPublished && (
          <Link
            href={`/events/${eventSlug}`}
            className="admin-btn admin-btn-secondary admin-btn-block"
            target="_blank"
          >
            <i className="bx bx-link-external"></i>
            View public page
          </Link>
        )}

        <button
          type="button"
          onClick={onPublishToggle}
          disabled={isPublishing}
          className={`admin-btn admin-btn-block ${isPublished ? "admin-btn-danger" : "admin-btn-success"}`}
        >
          {isPublishing ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              {isPublished ? "Unpublishing..." : "Publishing..."}
            </>
          ) : isPublished ? (
            <>
              <i className="bx bx-hide"></i>
              Unpublish
            </>
          ) : (
            <>
              <i className="bx bx-globe"></i>
              Publish
            </>
          )}
        </button>

        <hr />

        <button
          type="submit"
          disabled={isSubmitting}
          className={`admin-btn admin-btn-primary admin-btn-block ${isDirty ? "admin-btn-dirty" : ""}`}
          data-save-shortcut
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="bx bx-save"></i>
              Save changes
            </>
          )}
        </button>

        {isDirty && (
          <button
            type="button"
            onClick={onDiscard}
            className="admin-btn admin-btn-danger-outline admin-btn-block"
          >
            <i className="bx bx-undo"></i>
            Discard changes
          </button>
        )}
      </div>

      {/* Dirty State Indicator - at bottom to avoid layout shift */}
      {isDirty && (
        <div className="dirty-indicator">
          <i className="bx bx-edit-alt"></i>
          <span>You have unsaved changes</span>
        </div>
      )}
    </div>
  )
}
