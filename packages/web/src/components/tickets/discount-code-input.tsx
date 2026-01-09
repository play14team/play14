"use client"

import { useState, useEffect, useRef } from "react"
import type { DiscountValidationResult } from "./purchase.action"
import styles from "./discount-code-input.module.scss"

interface DiscountCodeInputProps {
  eventId: string
  orderAmount: number
  onValidCode: (result: DiscountValidationResult) => void
  onRemoveCode: () => void
  appliedDiscount: DiscountValidationResult | null
  validateDiscountCode: (
    eventId: string,
    code: string,
    orderAmount: number
  ) => Promise<DiscountValidationResult>
  initialCode?: string
}

export default function DiscountCodeInput({
  eventId,
  orderAmount,
  onValidCode,
  onRemoveCode,
  appliedDiscount,
  validateDiscountCode,
  initialCode,
}: DiscountCodeInputProps) {
  const [code, setCode] = useState(initialCode || "")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAutoApplied = useRef(false)

  // Auto-apply initial code if provided (e.g., after OAuth redirect)
  useEffect(() => {
    if (initialCode && !appliedDiscount && !hasAutoApplied.current && orderAmount > 0) {
      hasAutoApplied.current = true
      setCode(initialCode)
      // Auto-apply the code
      ;(async () => {
        setIsValidating(true)
        const result = await validateDiscountCode(eventId, initialCode, orderAmount)
        if (result.valid) {
          onValidCode(result)
          setCode("")
        } else {
          setError(result.error || "Invalid discount code")
        }
        setIsValidating(false)
      })()
    }
  }, [initialCode, appliedDiscount, orderAmount, eventId, validateDiscountCode, onValidCode])

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a discount code")
      return
    }

    setIsValidating(true)
    setError(null)

    const result = await validateDiscountCode(eventId, code.trim(), orderAmount)

    if (result.valid) {
      onValidCode(result)
      setCode("")
    } else {
      setError(result.error || "Invalid discount code")
    }

    setIsValidating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleApply()
    }
  }

  const handleRemove = () => {
    onRemoveCode()
    setError(null)
  }

  // Show applied discount
  if (appliedDiscount) {
    return (
      <div className={styles.appliedContainer}>
        <div className={styles.appliedCode}>
          <div className={styles.codeInfo}>
            <span className={styles.codeLabel}>Discount applied:</span>
            <span className={styles.codeValue}>{appliedDiscount.code}</span>
            {appliedDiscount.description && (
              <span className={styles.codeDescription}>{appliedDiscount.description}</span>
            )}
          </div>
          <div className={styles.discountInfo}>
            <span className={styles.discountValue}>
              {appliedDiscount.discountType === "percentage"
                ? `-${appliedDiscount.discountValue}%`
                : `-${appliedDiscount.discountAmount?.toFixed(2)}`}
            </span>
            <button
              type="button"
              className={styles.removeButton}
              onClick={handleRemove}
              aria-label="Remove discount code"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show input form
  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputRow}>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter discount code"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          disabled={isValidating}
        />
        <button
          type="button"
          className={styles.applyButton}
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
        >
          {isValidating ? "Checking..." : "Apply"}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
