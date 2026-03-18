"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import "./confirmation-dialog.scss"

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning" | "info"
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const t = useTranslations("admin")
  const resolvedConfirmLabel = confirmLabel ?? t("confirmationDialog.confirm")
  const resolvedCancelLabel = cancelLabel ?? t("confirmationDialog.cancel")
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Focus trap - focus the dialog when it opens
      dialogRef.current?.focus()

      // Prevent body scroll
      document.body.style.overflow = "hidden"

      // ESC key to close
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onCancel()
        }
      }
      document.addEventListener("keydown", handleEscape)

      return () => {
        document.body.style.overflow = ""
        document.removeEventListener("keydown", handleEscape)
      }
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return "bx-error-circle"
      case "warning":
        return "bx-info-circle"
      case "info":
        return "bx-question-circle"
      default:
        return "bx-info-circle"
    }
  }

  return (
    <div className="confirmation-dialog-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className={`confirmation-dialog confirmation-dialog-${variant}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        tabIndex={-1}
      >
        <div className="confirmation-dialog-header">
          <i className={`bx ${getIcon()}`} />
          <h3 id="dialog-title">{title}</h3>
        </div>
        <div className="confirmation-dialog-body">
          <p id="dialog-message">{message}</p>
        </div>
        <div className="confirmation-dialog-footer">
          <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`admin-btn ${variant === "danger" ? "admin-btn-danger" : "admin-btn-primary"}`}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
