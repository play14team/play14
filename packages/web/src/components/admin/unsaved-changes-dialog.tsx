"use client"

import { useEffect, useRef } from "react"

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
  isSaving?: boolean
}

/**
 * Modal dialog that warns users about unsaved changes.
 * Provides options to save changes, discard changes, or cancel navigation.
 */
export default function UnsavedChangesDialog({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Handle dialog open/close with native dialog API
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onCancel()
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [onCancel])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return

    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.bottom &&
      rect.left <= e.clientX &&
      e.clientX <= rect.right

    if (!isInDialog) {
      onCancel()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="unsaved-changes-dialog"
      onClick={handleBackdropClick}
    >
      <div className="unsaved-changes-content">
        <div className="unsaved-changes-icon">
          <i className="bx bx-error-circle"></i>
        </div>

        <h2>Unsaved Changes</h2>

        <p>
          You have unsaved changes that will be lost if you navigate away. What
          would you like to do?
        </p>

        <div className="unsaved-changes-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
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

          <button
            type="button"
            className="admin-btn admin-btn-danger-outline"
            onClick={onDiscard}
            disabled={isSaving}
          >
            <i className="bx bx-trash"></i>
            Discard Changes
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            <i className="bx bx-x"></i>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}
