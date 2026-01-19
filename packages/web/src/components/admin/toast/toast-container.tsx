"use client"

import { type Toast, type ToastType, useToast } from "./toast-context"

const ICONS: Record<ToastType, string> = {
  success: "bx-check-circle",
  error: "bx-error-circle",
  info: "bx-info-circle",
  warning: "bx-error",
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`admin-toast admin-toast-${toast.type}`} role="alert">
      <i className={`bx ${ICONS[toast.type]}`} />
      <span className="admin-toast-message">{toast.message}</span>
      <button type="button" className="admin-toast-close" onClick={onClose} aria-label="Dismiss">
        <i className="bx bx-x" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="admin-toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}
