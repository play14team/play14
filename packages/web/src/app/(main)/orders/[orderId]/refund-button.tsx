"use client"

import { requestRefund } from "@/components/tickets/purchase.action"
import { useRouter } from "next/navigation"
import { useState } from "react"
import styles from "./refund-button.module.scss"

interface RefundButtonProps {
  orderId: string
}

export default function RefundButton({ orderId }: RefundButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for the refund")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await requestRefund(orderId, reason)

    if (result.success) {
      // Refresh the page to show updated status
      router.refresh()
      setIsOpen(false)
    } else {
      setError(result.error || "Failed to process refund")
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className={styles.refundButton}>
        Request Refund
      </button>
    )
  }

  return (
    <div className={styles.refundModal}>
      <div className={styles.modalContent}>
        <h3>Request Refund</h3>
        <p className={styles.warning}>
          This will refund the full order amount and invalidate all tickets. This action cannot be
          undone.
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="reason">Reason for refund:</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for requesting this refund..."
            rows={4}
            disabled={isSubmitting}
            className={styles.textarea}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.modalActions}>
          <button
            onClick={() => {
              setIsOpen(false)
              setError(null)
              setReason("")
            }}
            disabled={isSubmitting}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={isSubmitting || !reason.trim()}
            className={styles.confirmButton}
          >
            {isSubmitting ? "Processing..." : "Confirm Refund"}
          </button>
        </div>
      </div>
    </div>
  )
}
