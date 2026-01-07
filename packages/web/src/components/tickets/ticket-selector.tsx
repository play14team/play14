"use client"

import { useState } from "react"
import type { TicketTypeInfo, TicketSelection } from "./purchase.action"
import styles from "./ticket-selector.module.scss"

interface TicketSelectorProps {
  eventName: string
  ticketTypes: TicketTypeInfo[]
  hasPaymentProvider: boolean
  onPurchase: (tickets: TicketSelection[]) => Promise<void>
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
  eventName,
  ticketTypes,
  hasPaymentProvider,
  onPurchase,
}: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currency = ticketTypes[0]?.currency || "EUR"

  // Only count purchasable tickets in total
  const totalAmount = ticketTypes
    .filter((tt) => tt.withinDateRange && !tt.soldOut)
    .reduce((sum, tt) => {
      return sum + tt.price * (quantities[tt.documentId] || 0)
    }, 0)

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
      await onPurchase(selectedTickets)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process order")
    } finally {
      setIsProcessing(false)
    }
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
      return (
        <span className={styles.statusBadge}>
          Available from {formatDate(tt.validFrom)}
        </span>
      )
    }
    if (tt.expired) {
      return <span className={styles.statusBadge}>Sales ended</span>
    }
    if (tt.available !== null) {
      return (
        <span className={styles.availability}>
          {tt.available} remaining
        </span>
      )
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
                  disabled={disabled || (tt.available !== null && (quantities[tt.documentId] || 0) >= tt.available)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.summary}>
        <div className={styles.total}>
          <span>Total ({totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"}):</span>
          <span className={styles.totalAmount}>
            {currency} {totalAmount.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          className={styles.purchaseButton}
          onClick={handlePurchase}
          disabled={totalQuantity === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Proceed to Payment"}
        </button>
      </div>
    </div>
  )
}
