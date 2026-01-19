"use client"

import { trackDiscountCodeValidation } from "@/libs/sentry-metrics"
import { useEffect, useState } from "react"
import DiscountCodeInput from "./discount-code-input"
import type {
  AuthStatus,
  DiscountValidationResult,
  TicketSelection,
  TicketTypeInfo,
} from "./purchase.action"
import { validateDiscountCode } from "./purchase.action"
import styles from "./ticket-selector.module.scss"

interface TicketSelectorProps {
  eventId: string
  eventName: string
  ticketTypes: TicketTypeInfo[]
  hasPaymentProvider: boolean
  authStatus: AuthStatus | null
  onPurchase: (tickets: TicketSelection[], discountCode?: string) => Promise<void>
  onAuthRequired: (quantities: Record<string, number>, discountCode?: string) => void
  initialQuantities?: Record<string, number>
  initialDiscountCode?: string
}

/**
 * Format a date for display (e.g., "May 18, 2026")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function TicketSelector({
  eventId,
  ticketTypes,
  hasPaymentProvider,
  authStatus,
  onPurchase,
  onAuthRequired,
  initialQuantities,
  initialDiscountCode,
}: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities || {})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountValidationResult | null>(null)
  const [pendingDiscountCode, setPendingDiscountCode] = useState<string | undefined>(
    initialDiscountCode
  )

  // Update quantities if initialQuantities changes (after OAuth redirect)
  useEffect(() => {
    if (initialQuantities && Object.keys(initialQuantities).length > 0) {
      setQuantities(initialQuantities)
    }
  }, [initialQuantities])

  // Set pending discount code when initial value changes
  useEffect(() => {
    if (initialDiscountCode) {
      setPendingDiscountCode(initialDiscountCode)
    }
  }, [initialDiscountCode])

  const currency = ticketTypes[0]?.currency || "EUR"

  // Calculate subtotal (before discount)
  const subtotal = ticketTypes
    .filter((tt) => tt.withinDateRange && !tt.soldOut)
    .reduce((sum, tt) => {
      return sum + tt.price * (quantities[tt.documentId] || 0)
    }, 0)

  // Calculate discount amount
  const discountAmount = appliedDiscount?.valid
    ? appliedDiscount.discountType === "percentage"
      ? subtotal * (appliedDiscount.discountValue! / 100)
      : Math.min(appliedDiscount.discountValue!, subtotal)
    : 0

  // Apply max discount cap if set
  const finalDiscountAmount =
    appliedDiscount?.discountAmount !== undefined
      ? Math.min(discountAmount, appliedDiscount.discountAmount)
      : discountAmount

  // Total after discount
  const totalAmount = Math.max(0, subtotal - finalDiscountAmount)

  const totalQuantity = Object.entries(quantities)
    .filter(([id]) => {
      const tt = ticketTypes.find((t) => t.documentId === id)
      return tt?.withinDateRange && !tt?.soldOut
    })
    .reduce((sum, [, qty]) => sum + qty, 0)

  const handleQuantityChange = (ticketTypeId: string, delta: number) => {
    const ticketType = ticketTypes.find((tt) => tt.documentId === ticketTypeId)

    // Don't allow changes for unavailable tickets
    if (!ticketType?.withinDateRange || ticketType.soldOut) {
      return
    }

    setQuantities((prev) => {
      const current = prev[ticketTypeId] || 0
      const newValue = Math.max(0, current + delta)

      if (ticketType?.available !== null && newValue > (ticketType?.available || 0)) {
        return prev
      }

      return {
        ...prev,
        [ticketTypeId]: newValue,
      }
    })
    setError(null)
  }

  const handlePurchase = async () => {
    // Check if user is authenticated
    if (!authStatus?.isAuthenticated) {
      onAuthRequired(quantities, appliedDiscount?.code)
      return
    }

    const selectedTickets = Object.entries(quantities)
      .filter(([id, qty]) => {
        if (qty <= 0) return false
        const tt = ticketTypes.find((t) => t.documentId === id)
        return tt?.withinDateRange && !tt?.soldOut
      })
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))

    if (selectedTickets.length === 0) {
      setError("Please select at least one ticket")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await onPurchase(selectedTickets, appliedDiscount?.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process order")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDiscountApplied = (result: DiscountValidationResult) => {
    // Track discount code validation
    trackDiscountCodeValidation(eventId, result.valid, result.discountType)
    setAppliedDiscount(result)
  }

  const handleDiscountRemoved = () => {
    setAppliedDiscount(null)
  }

  /**
   * Determine if a ticket is disabled (not purchasable)
   */
  function isTicketDisabled(tt: TicketTypeInfo): boolean {
    return tt.soldOut || !tt.withinDateRange
  }

  /**
   * Get the availability status text for a ticket
   */
  function getAvailabilityStatus(tt: TicketTypeInfo): React.ReactNode {
    if (tt.soldOut) {
      return <span className={styles.statusBadge}>Sold out</span>
    }
    if (tt.notYetAvailable && tt.validFrom) {
      return <span className={styles.statusBadge}>Available from {formatDate(tt.validFrom)}</span>
    }
    if (tt.expired) {
      return <span className={styles.statusBadge}>Sales ended</span>
    }
    if (tt.available !== null) {
      return <span className={styles.availability}>{tt.available} remaining</span>
    }
    return null
  }

  if (!hasPaymentProvider) {
    return (
      <div className={styles.unavailable}>
        <p>Online ticketing is not available for this event.</p>
        <p>Please contact the organizers for registration details.</p>
      </div>
    )
  }

  if (ticketTypes.length === 0) {
    return (
      <div className={styles.unavailable}>
        <p>No tickets are currently available for this event.</p>
      </div>
    )
  }

  return (
    <div className={styles.selector}>
      <h3>Get Your Tickets</h3>

      <div className={styles.ticketTypes}>
        {ticketTypes.map((tt) => {
          const disabled = isTicketDisabled(tt)
          return (
            <div
              key={tt.documentId}
              className={`${styles.ticketType} ${disabled ? styles.disabled : ""}`}
            >
              <div className={styles.ticketInfo}>
                <h4>{tt.name}</h4>
                {tt.description && <p className={styles.description}>{tt.description}</p>}
                <div className={styles.priceRow}>
                  <span className={styles.price}>
                    {tt.currency} {tt.price.toFixed(2)}
                  </span>
                  {getAvailabilityStatus(tt)}
                </div>
              </div>

              <div className={styles.quantitySelector}>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(tt.documentId, -1)}
                  disabled={!quantities[tt.documentId] || disabled}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className={styles.quantity}>{quantities[tt.documentId] || 0}</span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(tt.documentId, 1)}
                  disabled={
                    disabled ||
                    (tt.available !== null && (quantities[tt.documentId] || 0) >= tt.available)
                  }
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Discount Code Section */}
      {totalQuantity > 0 && (
        <DiscountCodeInput
          eventId={eventId}
          orderAmount={subtotal}
          onValidCode={handleDiscountApplied}
          onRemoveCode={handleDiscountRemoved}
          appliedDiscount={appliedDiscount}
          validateDiscountCode={validateDiscountCode}
          initialCode={pendingDiscountCode}
        />
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.summary}>
        {/* Show subtotal and discount when discount is applied */}
        {appliedDiscount?.valid && finalDiscountAmount > 0 && (
          <>
            <div className={styles.subtotalRow}>
              <span>
                Subtotal ({totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"}):
              </span>
              <span>
                {currency} {subtotal.toFixed(2)}
              </span>
            </div>
            <div className={styles.discountRow}>
              <span>Discount ({appliedDiscount.code}):</span>
              <span className={styles.discountAmount}>
                -{currency} {finalDiscountAmount.toFixed(2)}
              </span>
            </div>
          </>
        )}

        <div className={styles.total}>
          <span>
            {appliedDiscount?.valid && finalDiscountAmount > 0
              ? "Total:"
              : `Total (${totalQuantity} ${totalQuantity === 1 ? "ticket" : "tickets"}):`}
          </span>
          <span className={styles.totalAmount}>
            {currency} {totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Auth status indicator */}
        <div className={styles.authStatus}>
          {!authStatus?.isAuthenticated && (
            <p className={styles.authWarning}>
              You&apos;ll need to sign in to complete your purchase
            </p>
          )}
          {authStatus?.isAuthenticated && !authStatus.hasPlayer && (
            <p className={styles.authWarning}>
              You&apos;ll need to set up your player profile to continue
            </p>
          )}
          {authStatus?.isAuthenticated && authStatus.hasPlayer && (
            <p className={styles.authReady}>Purchasing as {authStatus.player?.name}</p>
          )}
        </div>

        <button
          type="button"
          className={styles.purchaseButton}
          onClick={handlePurchase}
          disabled={totalQuantity === 0 || isProcessing}
        >
          {isProcessing
            ? "Processing..."
            : !authStatus?.isAuthenticated
              ? "Sign in to Purchase"
              : "Proceed to Payment"}
        </button>
      </div>
    </div>
  )
}
