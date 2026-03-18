"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { requestRefund } from "@/components/tickets/purchase.action"
import styles from "./refund-button.module.scss"

interface RefundButtonProps {
  orderId: string
}

export default function RefundButton({ orderId }: RefundButtonProps) {
  const t = useTranslations("orders")
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!reason.trim()) {
      setError(t("refundReasonRequired"))
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
      setError(result.error || t("refundFailed"))
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className={styles.refundButton}>
        {t("requestRefund")}
      </button>
    )
  }

  return (
    <div className={styles.refundModal}>
      <div className={styles.modalContent}>
        <h3>{t("requestRefund")}</h3>
        <p className={styles.warning}>{t("refundWarning")}</p>

        <div className={styles.formGroup}>
          <label htmlFor="reason">{t("refundReason")}</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("refundReasonPlaceholder")}
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
            {t("cancel")}
          </button>
          <button
            onClick={handleRefund}
            disabled={isSubmitting || !reason.trim()}
            className={styles.confirmButton}
          >
            {isSubmitting ? t("processing") : t("confirmRefund")}
          </button>
        </div>
      </div>
    </div>
  )
}
